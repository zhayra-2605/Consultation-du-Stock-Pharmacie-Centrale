/**
 * controllers/statsController.js
 * Contrôleur pour les statistiques et analyses comparatives.
 * Responsabilité : Fournir des données historiques (Annuel/Mensuel) et comparer l'état des stocks entre régions.
 */

const { 
    pool, 
    logQueryError, 
    getRegionFields, 
    getVenteColsFromReg, 
    getRegionStockSumFromRow, 
    getRegionVenteSumFromRow,
    REGIONS_LIST,
    regionsMappingDB
} = require('../utils/db');

/**
 * Récupère les statistiques annuelles et mensuelles pour un produit spécifique.
 */
const getStatsProduit = async (req, res) => {
    const { codeProduit } = req.params;
    try {
        // 1. Statistiques Annuelles (Stock de fin d'année + Somme des ventes)
        const [years] = await pool.query(`
            WITH Ranked AS (
                SELECT ANNEE, STOCK_REGION,
                       ROW_NUMBER() OVER(PARTITION BY ANNEE ORDER BY MOIS DESC) as rn
                FROM stock_region_produit WHERE CODE_PRODUIT = ? AND REGION = 'NATIONAL'
            ),
            Ventes AS (
                SELECT ANNEE, SUM(VENTE_REGION) AS totalVente
                FROM stock_region_produit WHERE CODE_PRODUIT = ? AND REGION = 'NATIONAL'
                GROUP BY ANNEE
            )
            SELECT r.ANNEE, (r.STOCK_REGION + v.totalVente) AS totalStock, v.totalVente
            FROM Ranked r
            JOIN Ventes v ON r.ANNEE = v.ANNEE
            WHERE r.rn = 1
            ORDER BY r.ANNEE ASC
        `, [codeProduit, codeProduit]);

        // 2. Statistiques Mensuelles pour l'année la plus récente
        const [results] = await pool.query(`
            SELECT MOIS, STOCK_REGION AS totalStock, VENTE_REGION AS totalVente
            FROM stock_region_produit
            WHERE CODE_PRODUIT = ? AND REGION = 'NATIONAL'
              AND ANNEE = (SELECT ANNEE FROM stock_region_produit WHERE CODE_PRODUIT = ? ORDER BY ANNEE DESC LIMIT 1)
            ORDER BY MOIS ASC;
            
            -- Récupération de l'état actuel pour le détail par région
            SELECT * FROM fact_mouvements WHERE CODE_PRODUIT = ? ORDER BY ANNEE DESC, MOIS DESC LIMIT 1;
        `, [codeProduit, codeProduit, codeProduit]);

        const months = results[0];
        const row = results[1][0] || {};
        
        // 3. Calcul de la répartition régionale actuelle
        const regions = REGIONS_LIST.map(reg => ({
            region: reg,
            totalStock: getRegionStockSumFromRow(reg, row),
            totalVente: getRegionVenteSumFromRow(reg, row),
            mm: Math.round((getRegionVenteSumFromRow(reg, row) / 12) * 100) / 100,
        }));
        
        res.json({ years, months, regions });
    } catch (error) {
        logQueryError('/stats', error, [codeProduit]);
        res.status(500).json({ error: 'Database error', detail: error.message });
    }
};

/**
 * Récupère les statistiques pour un groupe de produits (Besoin).
 */
const getStatsBesoin = async (req, res) => {
    const { codeBesoin } = req.params;
    try {
        // Exécution en parallèle de plusieurs requêtes pour gagner du temps
        const [[years], [months], [rawRegions]] = await Promise.all([
            pool.execute(`
                WITH Ranked AS (
                    SELECT ANNEE, STOCK_REGION,
                           ROW_NUMBER() OVER(PARTITION BY ANNEE ORDER BY MOIS DESC) as rn
                    FROM stock_region_besoin WHERE CODE_BESOIN = ? AND REGION = 'NATIONAL'
                ),
                Ventes AS (
                    SELECT ANNEE, SUM(VENTE_REGION) AS totalVente
                    FROM stock_region_besoin WHERE CODE_BESOIN = ? AND REGION = 'NATIONAL'
                    GROUP BY ANNEE
                )
                SELECT r.ANNEE, (r.STOCK_REGION + v.totalVente) AS totalStock, v.totalVente
                FROM Ranked r
                JOIN Ventes v ON r.ANNEE = v.ANNEE
                WHERE r.rn = 1
                ORDER BY r.ANNEE ASC
            `, [codeBesoin, codeBesoin]),
            pool.execute(`
                SELECT MOIS, STOCK_REGION AS totalStock, VENTE_REGION AS totalVente
                FROM stock_region_besoin
                WHERE CODE_BESOIN = ? AND REGION = 'NATIONAL'
                  AND ANNEE = (SELECT MAX(ANNEE) FROM stock_region_besoin WHERE CODE_BESOIN = ? AND REGION = 'NATIONAL')
                ORDER BY MOIS ASC
            `, [codeBesoin, codeBesoin]),
            pool.execute(`
                WITH Latest AS (
                    SELECT *, ROW_NUMBER() OVER(PARTITION BY REGION ORDER BY ANNEE DESC, MOIS DESC) AS rn
                    FROM stock_region_besoin WHERE CODE_BESOIN = ? AND REGION != 'NATIONAL'
                )
                SELECT REGION, STOCK_REGION AS totalStock, VENTE_REGION AS totalVente FROM Latest WHERE rn = 1
            `, [codeBesoin]),
        ]);

        const regions = Object.entries(regionsMappingDB)
            .filter(([k]) => k !== 'NATIONAL')
            .map(([key, label]) => {
                const found = rawRegions.find(r => r.REGION === key);
                return {
                    region: label,
                    totalStock: found ? found.totalStock : 0,
                    totalVente: found ? found.totalVente : 0,
                    mm: found ? found.totalVente / 12 : 0,
                };
            });

        res.json({ years, months, regions });
    } catch (error) {
        logQueryError('/stats-besoin', error, [codeBesoin]);
        res.status(500).json({ error: 'Database error', detail: error.message });
    }
};

/**
 * Compare deux régions pour un produit/besoin sur une période donnée.
 */
const compareRegions = async (req, res) => {
    const { code, isBesoin, regionA, regionB, months } = req.query;
    const numMonths = parseInt(months) || 12;
    const isBesoinSearch = isBesoin === 'true';

    // Fonction interne pour récupérer les données d'une seule région
    const getRegionData = async (reg) => {
        if (isBesoinSearch) {
            // Logique spécifique pour les "Besoins"
            if (reg.toUpperCase() === 'NATIONAL') {
                const [r] = await pool.execute(`
                    SELECT ANNEE, MOIS, 'National' AS region,
                           SUM(STOCK_REGION) AS totalStock, SUM(VENTE_REGION) AS totalVente
                    FROM stock_region_besoin WHERE CODE_BESOIN = ? AND REGION != 'NATIONAL'
                    GROUP BY ANNEE, MOIS ORDER BY ANNEE DESC, MOIS DESC LIMIT ${numMonths}
                `, [code]);
                return r;
            }
            const [r] = await pool.execute(`
                SELECT ANNEE, MOIS, ? AS region, STOCK_REGION AS totalStock, VENTE_REGION AS totalVente
                FROM stock_region_besoin WHERE CODE_BESOIN = ? AND REGION = ?
                ORDER BY ANNEE DESC, MOIS DESC LIMIT ${numMonths}
            `, [reg, code, reg.toUpperCase()]);
            return r;
        }
        // Logique pour les produits individuels
        const fields = getRegionFields(reg);
        const vteCols = getVenteColsFromReg(reg);
        const [r] = await pool.execute(`
            SELECT ANNEE, MOIS, ? AS region,
                   (${fields.join('+')}) AS totalStock, (${vteCols.join('+')}) AS totalVente
            FROM fact_mouvements WHERE CODE_PRODUIT = ?
            ORDER BY ANNEE DESC, MOIS DESC LIMIT ${numMonths}
        `, [reg, code]);
        return r;
    };

    try {
        // Récupération simultanée des données pour les deux régions
        const [rowsA, rowsB] = await Promise.all([getRegionData(regionA), getRegionData(regionB)]);
        // Fusion et tri chronologique
        res.json([...rowsA, ...rowsB].sort((a, b) => (b.ANNEE * 100 + b.MOIS) - (a.ANNEE * 100 + a.MOIS)));
    } catch (error) {
        logQueryError('/compare-regions', error);
        res.status(500).json({ error: 'Database error' });
    }
};

/**
 * Analyse complexe des déséquilibres de stock entre deux régions.
 * Exemple : "Montre moi les produits en surstock à Tunis mais en rupture à Sfax".
 */
const compareRegionsAdvanced = async (req, res) => {
    const { code, isBesoin, region1, op1, val1, region2, op2, val2, historyMonths } = req.query;
    const isBesoinSearch = isBesoin === 'true';
    const months = parseInt(historyMonths) || 6;
    const threshold1 = parseFloat(val1) || 0;
    const threshold2 = parseFloat(val2) || 0;

    // Sécurisation des opérateurs SQL pour éviter les injections
    const ALLOWED_OPS = ['<', '>', '<=', '>=', '='];
    const safeOp1 = ALLOWED_OPS.includes(op1) ? op1 : '<';
    const safeOp2 = ALLOWED_OPS.includes(op2) ? op2 : '<';

    const codeFilter = isBesoinSearch ? 'CODE_BESOIN = ?' : 'CODE_PRODUIT = ?';
    const fields1 = getRegionFields(region1);
    const fields2 = getRegionFields(region2);
    const vteCols1 = getVenteColsFromReg(region1);
    const vteCols2 = getVenteColsFromReg(region2);

    try {
        // Requête massive utilisant des CTE et des jointures pour comparer les couvertures (Stock / Moyenne de Vente)
        const sql = `
            SELECT
                dp.CODE_PRODUIT AS code,
                dp.LIBELLE      AS libelle,
                latest.st1      AS stock1,
                latest.st2      AS stock2,
                history.mm1,
                history.mm2,
                -- Calcul du nombre de mois de couverture pour chaque région
                IF(history.mm1 > 0, latest.st1 / history.mm1, IF(latest.st1 > 0, 99, 0)) AS nbMois1,
                IF(history.mm2 > 0, latest.st2 / history.mm2, IF(latest.st2 > 0, 99, 0)) AS nbMois2
            FROM dim_produit dp
            INNER JOIN (
                SELECT CODE_PRODUIT,
                       (${fields1.join('+')}) AS st1,
                       (${fields2.join('+')}) AS st2,
                       ROW_NUMBER() OVER(PARTITION BY CODE_PRODUIT ORDER BY ANNEE DESC, MOIS DESC) AS rn
                FROM fact_mouvements
                WHERE CODE_PRODUIT IN (SELECT CODE_PRODUIT FROM dim_produit WHERE ${codeFilter})
            ) latest ON dp.CODE_PRODUIT = latest.CODE_PRODUIT AND latest.rn = 1
            INNER JOIN (
                SELECT CODE_PRODUIT,
                       SUM(${vteCols1.join('+')}) / NULLIF(COUNT(*), 0) AS mm1,
                       SUM(${vteCols2.join('+')}) / NULLIF(COUNT(*), 0) AS mm2
                FROM (
                    SELECT *, ROW_NUMBER() OVER(PARTITION BY CODE_PRODUIT ORDER BY ANNEE DESC, MOIS DESC) AS rn
                    FROM fact_mouvements
                    WHERE CODE_PRODUIT IN (SELECT CODE_PRODUIT FROM dim_produit WHERE ${codeFilter})
                ) ranked WHERE rn <= ?
                GROUP BY CODE_PRODUIT
            ) history ON dp.CODE_PRODUIT = history.CODE_PRODUIT
            WHERE ${isBesoinSearch ? 'dp.CODE_BESOIN = ?' : 'dp.CODE_PRODUIT = ?'}
            HAVING (nbMois1 ${safeOp1} ?) AND (nbMois2 ${safeOp2} ?)
            LIMIT 200
        `;

        const [results] = await pool.execute(sql, [code, code, months, code, threshold1, threshold2]);
        res.json(results);
    } catch (error) {
        logQueryError('/compare-regions-advanced', error);
        res.status(500).json({ error: 'Database error', detail: error.message });
    }
};

module.exports = {
    getStatsProduit,
    getStatsBesoin,
    compareRegions,
    compareRegionsAdvanced
};

