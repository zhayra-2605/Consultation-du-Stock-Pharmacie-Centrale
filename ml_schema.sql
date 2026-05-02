-- ============================================================
-- PHARMACIE CENTRALE — ML Schema (Sprint 3)
-- Créer ces 2 tables dans la base pharmacie_centrale
-- ============================================================

-- 1. FEATURE STORE : données préparées quotidiennement pour le ML
CREATE TABLE IF NOT EXISTS phct_ml_features (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    hub_id           VARCHAR(20)    NOT NULL,
    code_besoin      VARCHAR(20)    NOT NULL,
    label_besoin     VARCHAR(255),
    annee            INT            NOT NULL,
    mois             INT            NOT NULL,
    stock_total      DECIMAL(12,2)  DEFAULT 0,
    vente_mensuelle  DECIMAL(12,2)  DEFAULT 0,
    couverture_mois  FLOAT          DEFAULT 0,
    rupture_observee TINYINT(1)     DEFAULT 0,
    date_calcul      TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_hub_besoin (hub_id, code_besoin),
    INDEX idx_annee_mois (annee, mois)
);

-- 2. CACHE PRÉDICTIONS : résultats ML pour lecture instantanée
CREATE TABLE IF NOT EXISTS ml_predictions_cache (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    hub_id                VARCHAR(20)    NOT NULL,
    code_besoin           VARCHAR(20)    NOT NULL,
    label_besoin          VARCHAR(255),
    periode_mois          INT            NOT NULL,
    prediction_couverture FLOAT          DEFAULT 0,
    risque_rupture_prob   FLOAT          DEFAULT 0,
    rupture_predite       TINYINT(1)     DEFAULT 0,
    trend                 VARCHAR(10)    DEFAULT 'stable',
    days_to_stockout      INT            DEFAULT 999,
    date_prediction       TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cache_lookup (hub_id, periode_mois),
    INDEX idx_cache_besoin (code_besoin)
);
