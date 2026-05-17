import os
import sys
import logging
import joblib  # type: ignore
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import (
    mean_absolute_error, mean_squared_error, r2_score,
    recall_score, precision_score, accuracy_score, classification_report
)
from train_models import load_features, prepare_data, time_series_split
from features import FEATURES_RUPTURE, FEATURES_STOCK

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

def evaluate_classification():
    logger.info("\n============================================================")
    logger.info("    ÉVALUATION DU MODÈLE : XGBoost Classifier (Rupture)     ")
    logger.info("============================================================")
    
    df = load_features()
    X = prepare_data(df, FEATURES_RUPTURE)
    y = df['rupture_observee']
    
    _, X_te, _, y_te = time_series_split(X, y)
    
    try:
        model = joblib.load(os.path.join(MODEL_DIR, "model_rupture.pkl"))
        best_threshold = joblib.load(os.path.join(MODEL_DIR, "best_threshold.pkl"))
    except Exception as e:
        logger.error(f"[eval] ERREUR : Modèle de classification introuvable. Avez-vous lancé train_models.py ? ({e})")
        return
        
    y_prob = model.predict_proba(X_te)[:, 1]
    y_pred = (y_prob >= best_threshold).astype(int)
    
    recall = recall_score(y_te, y_pred)
    precision = precision_score(y_te, y_pred)
    
    accuracy = accuracy_score(y_te, y_pred)
    
    logger.info(f"- Accuracy  : {accuracy:.4f} -> Pourcentage de bonnes prédictions")
    logger.info(f"- Recall    : {recall:.4f} -> Capacite a detecter les ruptures reelles (Métrique critique)")
    logger.info(f"- Precision : {precision:.4f} -> Qualite des alertes de rupture")


def evaluate_regression():
    logger.info("\n============================================================")
    logger.info("    ÉVALUATION DU MODÈLE : XGBoost Regressor (Stock Futur)  ")
    logger.info("============================================================")
    
    df = load_features()
    X = prepare_data(df, FEATURES_STOCK)
    y = df['stock_next']
    
    _, X_te, _, y_te = time_series_split(X, y)
    
    try:
        model = joblib.load(os.path.join(MODEL_DIR, "model_stock.pkl"))
    except Exception as e:
        logger.error(f"[eval] ERREUR : Modèle de régression introuvable. Avez-vous lancé train_models.py ? ({e})")
        return
        
    y_pred = model.predict(X_te).clip(0, None)
    
    mae = mean_absolute_error(y_te, y_pred)
    rmse = np.sqrt(mean_squared_error(y_te, y_pred))
    r2 = r2_score(y_te, y_pred)
    
    y_mean = y_te.mean()
    rmse_pct = (rmse / y_mean * 100) if y_mean != 0 else 0
    
    logger.info(f"- MAE  : {mae:.2f} unites -> Erreur moyenne absolue")
    logger.info(f"- RMSE : {rmse:.2f} unites ({rmse_pct:.1f}%) -> Ecart-type des residus (penalise les fortes erreurs)")
    logger.info(f"- R2   : {r2:.4f} -> Qualite globale du modele")


if __name__ == "__main__":
    evaluate_classification()
    evaluate_regression()
