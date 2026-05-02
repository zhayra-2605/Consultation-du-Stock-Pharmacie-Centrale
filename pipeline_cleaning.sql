    -- ============================================================
-- PIPELINE DE NETTOYAGE ET OPTIMISATION (PHASE 1, 2, 3)
-- Pharmacie Centrale - Production Data Engineering
-- ============================================================

USE pharmacie_centrale;

-- 1. ARCHIVAGE DE LA COUCHE BRUTE (BRONZE)
RENAME TABLE fact_mouvements TO fact_mouvements_raw;
ALTER TABLE fact_mouvements_raw ADD COLUMN raw_id INT AUTO_INCREMENT PRIMARY KEY;

-- 2. CRÉATION DE LA COUCHE PROPRE (SILVER)
CREATE TABLE fact_mouvements_clean (
    clean_id INT AUTO_INCREMENT PRIMARY KEY,
    raw_reference_id INT,
    ANNEE SMALLINT,
    MOIS TINYINT,
    CODE_PRODUIT VARCHAR(100),
    STOCK_TOTAL DOUBLE,
    VENTE_TOTAL DOUBLE,
    CODE_BESOIN VARCHAR(100),
    sum_regional_stocks DOUBLE,
    is_duplicate TINYINT DEFAULT 0,
    is_anomaly TINYINT DEFAULT 0,
    is_simulated TINYINT DEFAULT 0,
    data_quality_score TINYINT DEFAULT 100,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_prod_period (CODE_PRODUIT, ANNEE, MOIS),
    INDEX idx_quality (data_quality_score),
    INDEX idx_anomaly (is_anomaly)
) ENGINE=InnoDB;

-- 3. TRANSFORMATION ET CHARGEMENT (LE COEUR DU PIPELINE)
INSERT INTO fact_mouvements_clean (
    raw_reference_id, ANNEE, MOIS, CODE_PRODUIT, STOCK_TOTAL, VENTE_TOTAL, CODE_BESOIN,
    sum_regional_stocks, is_duplicate, is_anomaly, is_simulated, data_quality_score
)
WITH RankedData AS (
    SELECT *,
           ROW_NUMBER() OVER (
               PARTITION BY CODE_PRODUIT, ANNEE, MOIS 
               ORDER BY STOCK_TOTAL DESC, raw_id DESC
           ) as row_num
    FROM fact_mouvements_raw
),
QualityAnalysis AS (
    SELECT 
        raw_id, CAST(ANNEE AS SIGNED) as ANNEE, CAST(MOIS AS SIGNED) as MOIS, CODE_PRODUIT, 
        VENTE_TOTAL, CODE_BESOIN,
        (COALESCE(STKTUDIPH,0) + COALESCE(STKCEPHOP,0) + COALESCE(STKSODHOP,0) + 
         COALESCE(STKGAFSA,0)  + COALESCE(STKKEF,0)    + COALESCE(STKMEDENINE,0)) as reg_sum,
        STOCK_TOTAL as original_stock,
        CASE WHEN ANNEE >= 2024 THEN 1 ELSE 0 END as simulated_flag,
        CASE WHEN STOCK_TOTAL > 5000000 OR (STOCK_TOTAL > 2000 AND VENTE_TOTAL <= 1) THEN 1 ELSE 0 END as anomaly_flag,
        row_num
    FROM RankedData
)
SELECT 
    raw_id, ANNEE, MOIS, CODE_PRODUIT, 
    LEAST(original_stock, VENTE_TOTAL * 48) as capped_stock, -- Capé à 4 ans de stock max
    VENTE_TOTAL, CODE_BESOIN,
    reg_sum,
    CASE WHEN row_num > 1 THEN 1 ELSE 0 END as is_duplicate,
    anomaly_flag,
    simulated_flag,
    GREATEST(0, 100 
        - (CASE WHEN row_num > 1 THEN 30 ELSE 0 END)
        - (CASE WHEN anomaly_flag = 1 THEN 40 ELSE 0 END)
        - (CASE WHEN simulated_flag = 1 THEN 10 ELSE 0 END)
    ) as dq_score
FROM QualityAnalysis
WHERE row_num = 1;

-- 4. CRÉATION DE LA COUCHE SERVICE (MART)
CREATE OR REPLACE VIEW v_fact_mouvements_dashboard AS
SELECT * FROM fact_mouvements_clean
WHERE is_anomaly = 0 AND is_duplicate = 0;

-- 5. INDEXATION FINALE POUR BI
ALTER TABLE fact_mouvements_clean ADD INDEX idx_dashboard_fast (ANNEE, MOIS, CODE_PRODUIT);
