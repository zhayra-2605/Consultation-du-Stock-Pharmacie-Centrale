"""
features.py — Centralisation des features pour l'entraînement et la prédiction.
Évite les désynchronisations entre train_models.py et batch_predict.py.
"""

# Features pour la classification (Rupture)
FEATURES_RUPTURE = [
    'couverture_mois', 
    'vente_mensuelle',
    'vente_lag_1', 
    'vente_lag_2', 
    'vente_lag_3',
    'trend_vente', 
    'rolling_mean_3', 
    'mois_sin', 
    'mois_cos'
]

# Features pour la régression (Stock)
FEATURES_STOCK = [
    'stock_total',
    'vente_mensuelle',
    'vente_lag_1', 
    'trend_vente', 
    'rolling_mean_3', 
    'mois_sin', 
    'mois_cos'
]

# Note : Les colonnes des Hubs (One-Hot) seront ajoutées dynamiquement 
# lors de l'entraînement et de la prédiction.
