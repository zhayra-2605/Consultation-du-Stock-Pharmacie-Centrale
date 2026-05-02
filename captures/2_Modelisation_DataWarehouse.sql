-- Création de la Dimension Produit
CREATE TABLE dim_produit AS
SELECT 
    cs.CODE_PRODUIT,
    cs.LIBELLE_PRODUIT AS LIBELLE,
    COALESCE(cs.CODE_BESOIN, tp.CODEBESOIN) AS CODE_BESOIN,
    cs.LIBELLE_BESOIN,
    cs.NOM_FOURNISSEUR,
    cs.NOM_PAYS,
    COALESCE(tp.PRESENTATION, cs.PRESENTATION_T) AS PRESENTATION,
    tp.PRESENTATIONNB,
    cs.INTERCHANGEABLE,
    tp.FORME,
    tp.DOSAGE1 as DOSAGE,
    tp.CLASSE
FROM consulter_stock cs
LEFT JOIN table_produit tp ON cs.CODE_PRODUIT = tp.CODE_PRODUIT;

-- Création de la Dimension Besoin
CREATE TABLE dim_besoin AS
SELECT 
    CODE_BESOIN,
    LIBELLE,
    CATEGORIE,
    FORME,
    VILLE,
    PRESENTATIONNB AS PRESENTATIONTYPE
FROM pcodebesoin;

-- Création de la Table des Faits (Mouvements)
CREATE TABLE fact_mouvements AS 
SELECT * FROM historique_mouvement;
