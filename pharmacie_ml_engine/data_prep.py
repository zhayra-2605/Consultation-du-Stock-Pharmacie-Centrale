"""
============================================================
data_prep.py — Phase 1 : Feature Engineering
============================================================
Lit stock_region_besoin + dim_besoin depuis MySQL,
calcule les features ML, et remplit la table phct_ml_features.
À exécuter avant train_models.py.
============================================================
"""
import mysql.connector
import pandas as pd
import numpy as np
import sys
from config import DB_CONFIG, HUBS_ACTIFS


def connect():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        print("[data_prep] OK: Connexion a la base de donnees OK")
        return conn
    except Exception as e:
        print(f"[data_prep] ERR: Erreur connexion : {e}")
        sys.exit(1)


def extract_data(conn):
    """Extraire les données historiques depuis stock_region_besoin."""
    hubs_placeholder = ",".join(["%s"] * len(HUBS_ACTIFS))
    query = f"""
        SELECT
            srb.CODE_BESOIN,
            db.LIBELLE         AS LABEL,
            srb.REGION         AS hub_id,
            srb.ANNEE,
            srb.MOIS,
            srb.STOCK_REGION,
            srb.VENTE_REGION
        FROM stock_region_besoin srb
        JOIN dim_besoin db ON srb.CODE_BESOIN = db.CODE_BESOIN
        WHERE srb.REGION IN ({hubs_placeholder})
          AND db.LIBELLE NOT LIKE '%DIVERS%'
          AND db.LIBELLE NOT LIKE '%divers%'
        ORDER BY srb.CODE_BESOIN, srb.REGION, srb.ANNEE, srb.MOIS
    """
    df = pd.read_sql(query, conn, params=HUBS_ACTIFS)
    print(f"[data_prep] INFO: Donnees extraites : {len(df):,} lignes, "
          f"{df['CODE_BESOIN'].nunique():,} besoins, {df['hub_id'].nunique()} hubs")
    return df


def clean_and_engineer(df):
    """Nettoyage et création des features avancées pour XGBoost."""
    print("[data_prep] INFO: Feature Engineering Avancé...")

    # 1. Imputation des ventes nulles/zéro par la médiane (hub, besoin)
    mediane = (
        df[df['VENTE_REGION'] > 0]
        .groupby(['CODE_BESOIN', 'hub_id'])['VENTE_REGION']
        .median()
        .reset_index()
        .rename(columns={'VENTE_REGION': 'vente_med'})
    )
    df = df.merge(mediane, on=['CODE_BESOIN', 'hub_id'], how='left')
    df['VENTE_REGION'] = np.where(
        df['VENTE_REGION'] <= 0,
        df['vente_med'].fillna(1.0),
        df['VENTE_REGION']
    )

    # 2. Feature de base : couverture
    df['couverture_mois'] = (df['STOCK_REGION'] / df['VENTE_REGION']).clip(0, 99)

    # 3. Tri pour calculs temporels
    df = df.sort_values(['CODE_BESOIN', 'hub_id', 'ANNEE', 'MOIS'])

    # 4. LAGS (Ventes M-1, M-2, M-3)
    for i in [1, 2, 3]:
        df[f'vente_lag_{i}'] = df.groupby(['CODE_BESOIN', 'hub_id'])['VENTE_REGION'].shift(i)
    
    # 5. TENDANCE & MOYENNE MOBILE
    # Tendance : variation par rapport au mois dernier
    df['trend_vente'] = df['VENTE_REGION'] - df['vente_lag_1'].fillna(df['VENTE_REGION'])
    # Moyenne mobile sur 3 mois (SHIFT(1) pour éviter le Data Leakage du mois courant)
    df['rolling_mean_3'] = df.groupby(['CODE_BESOIN', 'hub_id'])['VENTE_REGION'].transform(lambda x: x.shift(1).rolling(3).mean())

    # 6. SAISONNALITÉ CIRCULAIRE (Sin/Cos)
    # Permet au modèle de comprendre que Décembre (12) est proche de Janvier (1)
    df['mois_sin'] = np.sin(2 * np.pi * df['MOIS'] / 12)
    df['mois_cos'] = np.cos(2 * np.pi * df['MOIS'] / 12)

    # 7. ETIQUETTE DE RISQUE RUPTURE (couverture < 3 mois = alerte metier)
    # Seuil a 3 mois : capture ~20% des cas, permet au modele d'apprendre
    df['cov_next'] = df.groupby(['CODE_BESOIN', 'hub_id'])['couverture_mois'].shift(-1)
    df['rupture_observee'] = (df['cov_next'] < 3.0).astype(int)

    # NOUVELLE CIBLE : Le stock exact qu'il restera le mois d'après
    df['stock_next'] = df.groupby(['CODE_BESOIN', 'hub_id'])['STOCK_REGION'].shift(-1)

    # Supprimer les lignes avec historique incomplet (besoin des 3 mois de lag)
    df_clean = df.dropna(subset=['cov_next', 'vente_lag_3', 'stock_next']).copy()

    n_ruptures = df_clean['rupture_observee'].sum()
    print(f"[data_prep] INFO: {len(df_clean):,} lignes prets apres lags.")
    print(f"[data_prep] INFO: Risques etiquetes : {int(n_ruptures):,} ({n_ruptures/len(df_clean)*100:.2f}%)")

    return df_clean


def save_to_feature_store(df, conn):
    """Vider et remplir la table phct_ml_features avec les nouvelles colonnes."""
    print("[data_prep] INFO: Sauvegarde dans phct_ml_features...")

    cursor = conn.cursor()
    
    # On vérifie si les colonnes existent, sinon on les ajoute
    alter_queries = [
        "ALTER TABLE phct_ml_features ADD COLUMN IF NOT EXISTS vente_lag_1 FLOAT DEFAULT 0",
        "ALTER TABLE phct_ml_features ADD COLUMN IF NOT EXISTS vente_lag_2 FLOAT DEFAULT 0",
        "ALTER TABLE phct_ml_features ADD COLUMN IF NOT EXISTS vente_lag_3 FLOAT DEFAULT 0",
        "ALTER TABLE phct_ml_features ADD COLUMN IF NOT EXISTS trend_vente FLOAT DEFAULT 0",
        "ALTER TABLE phct_ml_features ADD COLUMN IF NOT EXISTS rolling_mean_3 FLOAT DEFAULT 0",
        "ALTER TABLE phct_ml_features ADD COLUMN IF NOT EXISTS mois_sin FLOAT DEFAULT 0",
        "ALTER TABLE phct_ml_features ADD COLUMN IF NOT EXISTS mois_cos FLOAT DEFAULT 0",
        "ALTER TABLE phct_ml_features ADD COLUMN IF NOT EXISTS stock_next FLOAT DEFAULT 0"
    ]
    for q in alter_queries:
        try: cursor.execute(q)
        except Exception: pass # Si IF NOT EXISTS n'est pas supporté ou colonne déjà là

    cursor.execute("TRUNCATE TABLE phct_ml_features")

    insert_sql = """
        INSERT INTO phct_ml_features
            (hub_id, code_besoin, label_besoin, annee, mois,
             stock_total, vente_mensuelle, couverture_mois, rupture_observee,
             vente_lag_1, vente_lag_2, vente_lag_3, trend_vente, rolling_mean_3,
             mois_sin, mois_cos, stock_next)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """

    rows = [
        (
            str(r.hub_id), str(r.CODE_BESOIN), str(r.LABEL),
            int(r.ANNEE), int(r.MOIS),
            float(r.STOCK_REGION), float(r.VENTE_REGION),
            float(r.couverture_mois), int(r.rupture_observee),
            float(r.vente_lag_1), float(r.vente_lag_2), float(r.vente_lag_3),
            float(r.trend_vente), float(r.rolling_mean_3),
            float(r.mois_sin), float(r.mois_cos), float(r.stock_next)
        )
        for r in df.itertuples(index=False)
    ]

    batch_size = 5000
    for i in range(0, len(rows), batch_size):
        cursor.executemany(insert_sql, rows[i:i + batch_size])
        conn.commit()

    print(f"[data_prep] OK: Feature Store prêt avec {len(rows):,} lignes")
    cursor.close()


def run():
    conn   = connect()
    df     = extract_data(conn)
    df     = clean_and_engineer(df)
    save_to_feature_store(df, conn)
    conn.close()
    print("[data_prep] Termine. Lancez maintenant : python train_models.py")


if __name__ == "__main__":
    run()
