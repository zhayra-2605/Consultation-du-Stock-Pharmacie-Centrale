"""
============================================================
batch_predict.py — Phase 2b : Prédictions Batch (nuit)
============================================================
Charge les modèles .pkl, lit la dernière snapshot du Feature Store,
génère les prédictions pour 3/6/12 mois, et remplit
la table ml_predictions_cache pour une lecture instantanée par l'API.

Planification recommandée :
  Windows Task Scheduler → chaque nuit à 02h00
  Commande : python "C:\...\pharmacie_ml_engine\batch_predict.py"
============================================================
"""
import mysql.connector
import pandas as pd
import numpy as np
import joblib  # type: ignore
import os
import sys
from datetime import datetime
from config import DB_CONFIG, PERIODES

from features import FEATURES_RUPTURE, FEATURES_STOCK

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")


def load_models():
    """Charger les modèles et les métadonnées (hubs, threshold)."""
    m_log = joblib.load(os.path.join(MODEL_DIR, "model_rupture.pkl"))
    m_lin = joblib.load(os.path.join(MODEL_DIR, "model_stock.pkl"))
    hub_cols = joblib.load(os.path.join(MODEL_DIR, "hub_columns.pkl"))
    raw_threshold = joblib.load(os.path.join(MODEL_DIR, "best_threshold.pkl"))
    # Seuil minimum 0.3 : évite que threshold=0 classe tout en rupture
    threshold = max(float(raw_threshold), 0.3)
    print(f"[batch] OK: Modeles charges (Threshold raw={raw_threshold:.4f} -> applique={threshold:.4f})")
    return m_log, m_lin, hub_cols, threshold


def load_latest_features(conn):
    """Charger la dernière snapshot avec toutes les features."""
    query = """
        SELECT f.hub_id, f.code_besoin, f.label_besoin,
               f.vente_mensuelle, f.couverture_mois, f.stock_total, f.mois,
               f.vente_lag_1, f.vente_lag_2, f.vente_lag_3,
               f.trend_vente, f.rolling_mean_3, f.mois_sin, f.mois_cos
        FROM (
            SELECT hub_id, code_besoin FROM phct_ml_features GROUP BY hub_id, code_besoin
        ) distinct_pairs
        JOIN phct_ml_features f ON f.id = (
            SELECT id FROM phct_ml_features f2 
            WHERE f2.hub_id = distinct_pairs.hub_id AND f2.code_besoin = distinct_pairs.code_besoin
            ORDER BY annee DESC, mois DESC LIMIT 1
        )
    """
    cursor = conn.cursor(dictionary=True)
    cursor.execute(query)
    rows = cursor.fetchall()
    cursor.close()
    df = pd.DataFrame(rows)
    # Cast explicite en float pour éviter l'erreur XGBoost (colonnes de type object)
    numeric_cols = [
        'stock_total', 'vente_mensuelle', 'couverture_mois',
        'vente_lag_1', 'vente_lag_2', 'vente_lag_3',
        'trend_vente', 'rolling_mean_3', 'mois_sin', 'mois_cos'
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0.0)
    print(f"[batch] INFO: {len(df):,} snapshots chargées")
    return df


def compute_trend(couverture, periode, proba_rupture):
    """Calculer la tendance en intégrant la probabilité de rupture."""
    if proba_rupture > 0.7: return 'down' # Priorité au risque prédit
    
    ratio = couverture / max(periode, 1)
    if ratio < 0.4: return 'down'
    if ratio > 1.4: return 'up'
    return 'stable'


def run():
    print(f"\n[batch] START -- {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # 1. Chargement
    conn = mysql.connector.connect(**DB_CONFIG)
    m_log, m_lin, hub_cols, threshold = load_models()
    df = load_latest_features(conn)

    if df.empty:
        print("[batch] WARN: Feature Store vide.")
        conn.close()
        sys.exit(0)

    # 2. One-Hot Encoding des Hubs (alignement avec l'entraînement)
    df_hubs = pd.get_dummies(df['hub_id'], prefix='hub')
    # S'assurer que TOUTES les colonnes vues au train sont présentes (même si absentes ici)
    for col in hub_cols:
        if col not in df_hubs.columns:
            df_hubs[col] = 0
    df_hubs = df_hubs[hub_cols] # Réordonner

    # 3. Prédictions
    X_log = pd.concat([df[FEATURES_RUPTURE], df_hubs], axis=1).values
    X_lin = pd.concat([df[FEATURES_STOCK], df_hubs], axis=1).values

    proba_rupture  = m_log.predict_proba(X_log)[:, 1]   
    rupture_bin    = (proba_rupture >= threshold).astype(int)
    
    # 3b. Prédiction du STOCK FUTUR (au lieu de la couverture)
    stock_fut = np.clip(m_lin.predict(X_lin), 0, None)
    
    # 3c. Recalcul métier : Couverture Prédite = Stock Prédit / CMM (rolling_mean_3)
    cmm_values = df['rolling_mean_3'].fillna(1.0).clip(lower=1.0).values
    couverture_fut = np.clip(stock_fut / cmm_values, 0, 99)
    
    # 3d. Cohérence de rupture : on s'assure que si la couverture < 1 mois, l'alerte rupture est active
    rupture_bin = np.where(couverture_fut < 1.0, 1, 0)
    n = len(stock_fut)
    for i in range(n):
        if couverture_fut[i] < 1.0:
            proba_rupture[i] = max(proba_rupture[i], 0.80)
        elif couverture_fut[i] < 3.0:
            proba_rupture[i] = max(proba_rupture[i], 0.40)

    print("[batch] ML: XGBoost Native Inference terminee.")

    # 4. Insertion
    rows = []
    for i, r in enumerate(df.itertuples(index=False)):  # noqa: PD007
        vente = float(r.vente_mensuelle) if r.vente_mensuelle > 0 else 1.0  # type: ignore[union-attr]
        stock = float(r.stock_total)  # type: ignore[union-attr]
        jours = max(0, min(int(stock / (vente / 30.0)), 999))

        cov_val = float(couverture_fut[i])
        stk_val = float(stock_fut[i])
        cmm_val = float(cmm_values[i])
        prob    = float(proba_rupture[i])
        rupt    = int(rupture_bin[i])

        hub_id      = str(r.hub_id)        # type: ignore[union-attr]
        code_besoin = str(r.code_besoin)   # type: ignore[union-attr]
        label_besoin = str(r.label_besoin) # type: ignore[union-attr]

        for p in PERIODES:
            rows.append((
                hub_id, code_besoin, label_besoin, p,
                round((cov_val / p) * 100.0, 2),
                round(prob, 4), rupt,
                compute_trend(cov_val, p, prob),
                jours, stk_val, cmm_val
            ))

    cursor = conn.cursor()
    cursor.execute("TRUNCATE TABLE ml_predictions_cache")
    insert_sql = """
        INSERT INTO ml_predictions_cache
            (hub_id, code_besoin, label_besoin, periode_mois,
             prediction_couverture, risque_rupture_prob, rupture_predite,
             trend, days_to_stockout, stock_predit, cmm_utilisee)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    batch_size = 5000
    for i in range(0, len(rows), batch_size):
        cursor.executemany(insert_sql, rows[i:i + batch_size])
        conn.commit()

    print(f"[batch] OK: {len(rows):,} lignes insérées.")
    cursor.close()
    conn.close()
    print(f"[batch] FINISHED")
    print("[batch]    L'API Node.js peut maintenant servir les predictions")


if __name__ == "__main__":
    run()
