# ============================================================
# config.py — Configuration de la connexion à la base de données
# ============================================================

DB_CONFIG = {
    "host":     "localhost",
    "user":     "root",
    "password": "",
    "database": "pharmacie_centrale"
}

# Hubs actifs dans l'interface (RÉSERVE et NATIONAL exclus)
HUBS_ACTIFS = ["TUNIS", "SFAX", "SOUSSE", "GAFSA", "KEF", "MEDENINE"]

# Périodes de prévision (en mois)
PERIODES = [3, 6, 12]

# Seuil de couverture critique (< 1 mois = rupture)
SEUIL_RUPTURE_MOIS = 1.0
