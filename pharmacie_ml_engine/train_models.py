"""
train_models.py - Phase 2a : Entrainement XGBoost
Lit phct_ml_features, entraine 2 modeles, affiche les metriques,
et sauvegarde les fichiers .pkl dans le dossier models/.
"""
import os
import sys
import logging
from typing import Tuple, List, Any

import mysql.connector
import pandas as pd
import numpy as np
import joblib  # type: ignore
import xgboost as xgb
from sklearn.metrics import (
    r2_score, mean_absolute_error, mean_squared_error,
    recall_score, precision_score, roc_auc_score,
    precision_recall_curve
)

from features import FEATURES_RUPTURE, FEATURES_STOCK
from config import DB_CONFIG

# Configuration
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODEL_DIR, exist_ok=True)
RANDOM_STATE = 42

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)


def load_features() -> pd.DataFrame:
    """Charger les features depuis phct_ml_features (tries par date)."""
    conn: Any = None
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM phct_ml_features ORDER BY annee ASC, mois ASC")
        rows = cursor.fetchall()
        cursor.close()
        df = pd.DataFrame(rows)
        # Cast explicite en float pour éviter l'erreur XGBoost (colonnes de type object)
        numeric_cols = [
            'stock_total', 'vente_mensuelle', 'couverture_mois',
            'vente_lag_1', 'vente_lag_2', 'vente_lag_3',
            'trend_vente', 'rolling_mean_3', 'mois_sin', 'mois_cos',
            'stock_next', 'rupture_observee'
        ]
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0.0)
        logger.info(f"[train] OK: Dataset charge : {len(df):,} lignes")
        return df
    except Exception as e:
        logger.error(f"[train] ERR: Erreur chargement : {e}")
        sys.exit(1)
    finally:
        if conn and conn.is_connected():
            conn.close()


def prepare_data(df: pd.DataFrame, feature_cols: List[str]) -> pd.DataFrame:
    """One-Hot Encoding des hubs + concatenation des features."""
    df_hubs = pd.get_dummies(df['hub_id'], prefix='hub')
    X = pd.concat([df[feature_cols], df_hubs], axis=1)
    
    hub_cols_path = os.path.join(MODEL_DIR, "hub_columns.pkl")
    joblib.dump(list(df_hubs.columns), hub_cols_path)
    
    return X


def time_series_split(X: pd.DataFrame, y: Any, test_size: float = 0.2) -> Tuple[pd.DataFrame, pd.DataFrame, Any, Any]:
    """Split temporel strict - pas de data leakage."""
    split_idx = int(len(X) * (1 - test_size))
    return X.iloc[:split_idx], X.iloc[split_idx:], y.iloc[:split_idx], y.iloc[split_idx:]


def train_xgboost_rupture(df: pd.DataFrame) -> xgb.XGBClassifier:
    """Modele 1 : XGBClassifier (Rupture) avec threshold optimal."""
    logger.info("\n[train] --- Modele 1 : XGBoost Classifier (Rupture) ---")

    X = prepare_data(df, FEATURES_RUPTURE)
    y = df['rupture_observee']

    X_tr, X_te, y_tr, y_te = time_series_split(X, y)

    count_0 = len(y_tr[y_tr == 0])
    count_1 = len(y_tr[y_tr == 1])
    spw = count_0 / count_1 if count_1 > 0 else 1.0
    logger.info(f"[train]   Desequilibre: {count_0} OK / {count_1} Ruptures (SPW={spw:.2f})")

    model = xgb.XGBClassifier(
        n_estimators=500,
        max_depth=8,
        learning_rate=0.05,
        scale_pos_weight=spw,
        objective='binary:logistic',
        eval_metric='logloss',
        random_state=RANDOM_STATE
    )
    model.fit(X_tr, y_tr)

    y_prob = model.predict_proba(X_te)[:, 1]
    precisions, recalls, thresholds = precision_recall_curve(y_te, y_prob)

    target_recall = 0.85
    idx = np.where(recalls >= target_recall)[0]
    best_idx = idx[-1] if len(idx) > 0 else 0
    best_threshold = float(thresholds[best_idx])

    joblib.dump(best_threshold, os.path.join(MODEL_DIR, "best_threshold.pkl"))

    y_pred = (y_prob >= best_threshold).astype(int)

    logger.info(f"[train]   Threshold Optimal : {best_threshold:.4f}")
    logger.info(f"[train]   Recall (Rupture)  : {recall_score(y_te, y_pred):.4f}")
    logger.info(f"[train]   Precision         : {precision_score(y_te, y_pred):.4f}")
    logger.info(f"[train]   ROC AUC           : {roc_auc_score(y_te, y_prob):.4f}")

    path = os.path.join(MODEL_DIR, "model_rupture.pkl")
    joblib.dump(model, path)
    logger.info(f"[train]   Sauvegarde : {path}")
    
    return model


def train_xgboost_stock(df: pd.DataFrame) -> xgb.XGBRegressor:
    """Modele 2 : XGBRegressor (Stock Futur)."""
    logger.info("\n[train] --- Modele 2 : XGBoost Regressor (Stock) ---")

    X = prepare_data(df, FEATURES_STOCK)
    y = df['stock_next']

    X_tr, X_te, y_tr, y_te = time_series_split(X, y)

    model = xgb.XGBRegressor(
        n_estimators=500,
        max_depth=8,
        learning_rate=0.05,
        random_state=RANDOM_STATE
    )
    model.fit(X_tr, y_tr)

    y_pred = model.predict(X_te).clip(0, None)
    rmse = np.sqrt(mean_squared_error(y_te, y_pred))
    logger.info(f"[train]   R2  : {r2_score(y_te, y_pred):.4f}")
    logger.info(f"[train]   MAE : {mean_absolute_error(y_te, y_pred):.2f} unités")
    logger.info(f"[train]   RMSE: {rmse:.2f} unités")

    path = os.path.join(MODEL_DIR, "model_stock.pkl")
    joblib.dump(model, path)
    logger.info(f"[train]   Sauvegarde : {path}")
    
    return model


def run() -> None:
    df = load_features()
    train_xgboost_rupture(df)
    train_xgboost_stock(df)
    logger.info("\n[train] DONE: XGBoost Training Termine.")


if __name__ == "__main__":
    run()
