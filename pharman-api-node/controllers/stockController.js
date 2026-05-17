/**
 * controllers/stockController.js
 * Contrôleur pour la gestion des stocks.
 * Responsabilité : Calculer les résumés de stock par produit/besoin et fournir les détails par dépôt (lot, péremption).
 */

const { 
    pool, 
    logQueryError, 
    getRegionStockSumFromRow, 
    getRegionVenteSumFromRow, 
    correctNational,
    regionsMappingDB,
    depotNameGroups
} = require('../utils/db');

/**
 * Fonction d'aide pour construire la requête SQL complexe des détails de stock.
 * Elle gère le filtrage par région et le calcul des totaux régionaux/nationaux.
 */
const buildStockDetailsSql = (whereField, filterByDepot, regionName) => {
    // Transformation du nom de la région en clé pour la base de données
    const regionKey = regionName ? regionName.toUpperCase().replace('É', 'E') : 'NATIONAL';
    
    // Logique SQL pour regrouper les dépôts physiques dans les régions logiques
    const dynamicRegionSql = `
        CASE 
            WHEN sd.LIBELLE_DEPOT IN ('TUDIPHARMA', 'TUNIS', 'MAGASIN CENTRAL', 'DEPOT CHERGUIA', 'AERIEN', 'MARITIME') THEN 'TUNIS'
            WHEN sd.LIBELLE_DEPOT IN ('DEPOT SFAX') THEN 'SFAX'
            WHEN sd.LIBELLE_DEPOT IN ('DEPOT SOUSSE') THEN 'SOUSSE'
            WHEN sd.LIBELLE_DEPOT IN ('DEPOT LE KEF') THEN 'KEF'
            WHEN sd.LIBELLE_DEPOT IN ('DEPOT GAFSA') THEN 'GAFSA'
            WHEN sd.LIBELLE_DEPOT IN ('DEPOT MEDENINE') THEN 'MEDENINE'
            WHEN sd.LIBELLE_DEPOT IN ('RESERVE HOPITAUX', 'RESERVE', 'RESERVE STRATEGIQUE') THEN 'RESERVE'
            ELSE 'NATIONAL'
        END
    `;
    
    const targetRegion = regionName === 'National' ? dynamicRegionSql : `'${regionKey}'`;

    let sql = `
        SELECT
            sd.CODE_PRODUIT,
            dp.LIBELLE        AS LIBELLE_PRODUIT,
            sd.LIBELLE_DEPOT,
            sd.LOT            AS NUM_LOT,
            -- Formatage de la date de péremption (souvent stockée en format numérique YYYY)
            IF(sd.DATEPEREMP IS NULL OR sd.DATEPEREMP = '', '-', CONCAT('01-01-', CAST(ROUND(sd.DATEPEREMP) AS CHAR))) AS DATEPEREMP,
            sd.QUANTITET      AS STOCK,
            sd.QTE_BLOQUEE,
            sd.QUARANTAINE,
            -- Sous-requêtes pour récupérer les dernières statistiques connues
            (SELECT ANNEE FROM fact_mouvements WHERE CODE_PRODUIT = sd.CODE_PRODUIT ORDER BY ANNEE DESC, MOIS DESC LIMIT 1) AS ANNEE,
            (SELECT STOCK_TOTAL FROM fact_mouvements WHERE CODE_PRODUIT = sd.CODE_PRODUIT ORDER BY ANNEE DESC, MOIS DESC LIMIT 1) AS STOCK_TOTAL,
            (SELECT VENTE_TOTAL FROM fact_mouvements WHERE CODE_PRODUIT = sd.CODE_PRODUIT ORDER BY ANNEE DESC, MOIS DESC LIMIT 1) AS VENTE_TOTAL,
            (SELECT STOCK_REGION FROM stock_region_produit WHERE CODE_PRODUIT = sd.CODE_PRODUIT AND REGION = ${targetRegion} ORDER BY ANNEE DESC, MOIS DESC LIMIT 1) AS STOCK_REGION,
            (SELECT VENTE_REGION FROM stock_region_produit WHERE CODE_PRODUIT = sd.CODE_PRODUIT AND REGION = ${targetRegion} ORDER BY ANNEE DESC, MOIS DESC LIMIT 1) AS VENTE_REGION
        FROM stock_depot sd
        INNER JOIN dim_produit dp ON sd.CODE_PRODUIT = dp.CODE_PRODUIT
        WHERE ${whereField} = ?
    `;
    // Filtrage par dépôts spécifiques si on n'est pas au niveau National
    if (filterByDepot) sql += ` AND sd.LIBELLE_DEPOT IN (${filterByDepot.map(() => '?').join(', ')})`;
    return sql;
};

/**
 * Récupère le résumé des stocks (quantité totale et ventes) pour un produit, découpé par région.
 */
const getStockSummary = async (req, res) => {
    const { codeProduit } = req.params;
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM fact_mouvements WHERE CODE_PRODUIT = ? ORDER BY ANNEE DESC, MOIS DESC LIMIT 1',
            [codeProduit]
        );
        const row = rows[0] || {};
        const DEPOTS = ['National', 'Réserve', 'Tunis', 'Sousse', 'Sfax', 'Medenine', 'Gafsa', 'Kef'];
        
        // Construction du tableau de résultats pour le graphique/tableau du frontend
        const result = DEPOTS.map(depot => ({
            depot,
            totalStock: depot === 'National' ? (row.STOCK_TOTAL || 0) : getRegionStockSumFromRow(depot, row),
            totalVente: depot === 'National' ? (row.VENTE_TOTAL || 0) : getRegionVenteSumFromRow(depot, row),
        }));
        
        correctNational(result); // Ajustement de sécurité
        res.json(result);
    } catch (error) {
        logQueryError('/stock-summary', error, [codeProduit]);
        res.status(500).json({ error: 'Database error', detail: error.message });
    }
};

/**
 * Récupère les détails précis (Lots, Quantités par dépôt physique) pour un produit.
 */
const getStockDetails = async (req, res) => {
    const { codeProduit, depot } = req.params;
    const targetDepots = depotNameGroups[depot];
    const sql = buildStockDetailsSql('sd.CODE_PRODUIT', depot !== 'National' ? targetDepots : null, depot);
    const params = [codeProduit, ...(depot !== 'National' && targetDepots ? targetDepots : [])];
    try {
        const [rows] = await pool.execute(sql, params);
        res.json(rows);
    } catch (error) {
        logQueryError(`/stock-details/${codeProduit}/${depot}`, error, params);
        res.status(500).json({ error: 'Erreur lors du chargement des détails de stock', detail: error.message });
    }
};

/**
 * Identique à getStockDetails mais filtre par CODE_BESOIN (regroupement de produits).
 */
const getStockDetailsBesoin = async (req, res) => {
    const { codeBesoin, depot } = req.params;
    const targetDepots = depotNameGroups[depot];
    let sql = buildStockDetailsSql('dp.CODE_BESOIN', depot !== 'National' ? targetDepots : null, depot);
    sql += ' ORDER BY sd.DATEPEREMP ASC'; // Tri par date de péremption pour aider à la gestion FEFO
    const params = [codeBesoin, ...(depot !== 'National' && targetDepots ? targetDepots : [])];
    try {
        const [rows] = await pool.execute(sql, params);
        res.json(rows);
    } catch (error) {
        logQueryError(`/stock-details-besoin/${codeBesoin}/${depot}`, error, params);
        res.status(500).json({ error: 'Erreur lors du chargement des détails de stock (Besoin)', detail: error.message });
    }
};

/**
 * Résumé des stocks pour un groupe de produits (Besoin).
 */
const getStockSummaryBesoin = async (req, res) => {
    const { codeBesoin } = req.params;
    try {
        // Utilisation d'une CTE (Common Table Expression) pour prendre les statistiques les plus récentes
        const [rows] = await pool.execute(`
            WITH LatestSRB AS (
                SELECT *, ROW_NUMBER() OVER(PARTITION BY CODE_BESOIN, REGION ORDER BY ANNEE DESC, MOIS DESC) AS rn
                FROM stock_region_besoin WHERE CODE_BESOIN = ?
            )
            SELECT REGION, STOCK_REGION, VENTE_REGION FROM LatestSRB WHERE rn = 1
        `, [codeBesoin]);

        const result = Object.entries(regionsMappingDB).map(([dbKey, label]) => {
            const found = rows.find(r => r.REGION === dbKey);
            return { depot: label, totalStock: found ? Number(found.STOCK_REGION) : 0, totalVente: found ? Number(found.VENTE_REGION) : 0 };
        });
        correctNational(result);
        res.json(result);
    } catch (error) {
        logQueryError('/stock-summary-besoin', error, [codeBesoin]);
        res.status(500).json({ error: 'Database error', detail: error.message });
    }
};

/**
 * Récupère l'historique des livraisons pour un groupe de produits.
 */
const getLivraisonsBesoin = async (req, res) => {
    const { codeBesoin } = req.params;
    try {
        const [livraisons] = await pool.execute(`
            SELECT 
                l.CODE_PRODUIT, 
                l.ANNEE, 
                l.MOIS, 
                l.QTE_A_LIVRER, 
                l.QTE_CONVERTI 
            FROM fact_livraisons l
            JOIN dim_produit p ON l.CODE_PRODUIT = p.CODE_PRODUIT
            WHERE p.CODE_BESOIN = ?
            ORDER BY l.ANNEE ASC, l.MOIS ASC
        `, [codeBesoin]);
        res.json(livraisons);
    } catch (error) {
        logQueryError('/livraisons-besoin', error, [codeBesoin]);
        res.status(500).json({ error: 'Database error', detail: error.message });
    }
};

module.exports = {
    getStockSummary,
    getStockDetails,
    getStockDetailsBesoin,
    getStockSummaryBesoin,
    getLivraisonsBesoin
};

