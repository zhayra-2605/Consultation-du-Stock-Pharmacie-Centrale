const express = require('express');
const router = express.Router();
const NodeCache = require('node-cache');
const { 
    pool, 
    logQueryError, 
    initializeRegions, 
    getRegionFields, 
    getVenteColsFromReg, 
    getRegionStockSumFromRow, 
    getRegionVenteSumFromRow, 
    correctNational,
    REGIONS_LIST,
    regionsMappingDB,
    depotNameGroups
} = require('../utils/db');

// Cache RAM 24h — évite de requêter la DB à chaque appel dashboard
const predCache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 });

// Initialize regions on startup
initializeRegions();

// --- API Routes ---

// 1. RECHERCHE PRODUIT
router.get('/search', async (req, res) => {
    const { critere, valeur } = req.query;
    const val = (valeur || '').trim();

    const ALLOWED = ['Code Produit', 'Libellé Produit', 'Code Besoin', 'Libellé Besoin'];
    if (!ALLOWED.includes(critere)) {
        return res.status(400).json({ error: 'Critère de recherche invalide' });
    }

    let sql;
    const params = [];
    try {
        if (critere === 'Code Besoin' || critere === 'Libellé Besoin') {
            sql = `
                SELECT DISTINCT
                    db.CODE_BESOIN,
                    db.LIBELLE          AS LIBELLE_BESOIN,
                    db.PRESENTATIONTYPE AS PRESENTATION_T,
                    db.CATEGORIE        AS NATURE_BESOIN
                FROM dim_besoin db WHERE 1=1
            `;
            if (val) {
                sql += critere === 'Code Besoin' ? ' AND db.CODE_BESOIN LIKE ?' : ' AND db.LIBELLE LIKE ?';
                params.push(`%${val}%`);
            }
            sql += ' LIMIT 100';
        } else {
            const column = critere === 'Code Produit' ? 'CODE_PRODUIT' : 'LIBELLE';
            sql = `
                WITH MatchingProducts AS (
                    SELECT CODE_PRODUIT FROM dim_produit WHERE ${column} LIKE ?
                ),
                LatestMouvement AS (
                    SELECT fm.ANNEE, fm.MOIS, fm.DATEMVT, fm.CODE_PRODUIT, fm.STOCK_TOTAL, fm.VENTE_TOTAL,
                           ROW_NUMBER() OVER(PARTITION BY fm.CODE_PRODUIT ORDER BY fm.ANNEE DESC, fm.MOIS DESC) AS rn
                    FROM fact_mouvements fm
                    INNER JOIN MatchingProducts mp ON fm.CODE_PRODUIT = mp.CODE_PRODUIT
                )
                SELECT
                    hm.ANNEE, hm.MOIS, hm.DATEMVT,
                    hm.CODE_PRODUIT,
                    dp.LIBELLE           AS LIBELLE_PRODUIT,
                    dp.CODE_BESOIN,
                    db.LIBELLE           AS LIBELLE_BESOIN,
                    dp.NOM_FOURNISSEUR,
                    dp.NOM_PAYS,
                    dp.PRESENTATION      AS PRESENTATION_T,
                    dp.PRESENTATIONNB    AS P_NB,
                    db.PRESENTATIONTYPE  AS P_TYPE,
                    dp.INTERCHANGEABLE,
                    dp.SIGLE,  dp.VEIC,
                    dp.ETATPRODUIT       AS ETAT,
                    ROUND(COALESCE(hm.STOCK_TOTAL, 0), 0) AS STOCK_TOTAL,
                    ROUND(COALESCE(hm.STOCK_TOTAL, 0) * (CAST(COALESCE(dp.PRESENTATIONNB, 1) AS DECIMAL) / NULLIF(COALESCE(db.PRESENTATIONTYPE, 1), 0)), 0) AS STOCK_CONVERTI,
                    COALESCE(hm.VENTE_TOTAL, 0) AS VENTE_TOTAL
                FROM LatestMouvement hm
                INNER JOIN dim_produit dp ON hm.CODE_PRODUIT = dp.CODE_PRODUIT
                LEFT  JOIN dim_besoin  db ON dp.CODE_BESOIN  = db.CODE_BESOIN
                WHERE hm.rn = 1
                LIMIT 100
            `;
            params.push(`%${val}%`);
        }

        const [rows] = await pool.execute(sql, params);
        res.json(rows);
    } catch (error) {
        logQueryError('/search', error, params);
        res.status(500).json({ error: 'Erreur base de données', detail: error.message });
    }
});

// 2. FICHE PRODUIT
router.get('/produit/:code', async (req, res) => {
    const { code } = req.params;
    try {
        const [rows] = await pool.execute(`
            SELECT dp.*,
                db.LIBELLE       AS LIBELLE_BESOIN_FULL,
                db.PRESENTATIONTYPE,
                db.CATEGORIE     AS CATEGORIE_BESOIN,
                tp.DATECREATION, tp.DESCRIPTION, tp.MEDICAMENT, tp.TYPEPROD,
                tp.AMM, tp.DATEAMM, tp.DATEPRIX, tp.STUP, tp.PSYCHO,
                df.NOM_PAYS      AS PAYS_PROVENANCE,
                df.NOM_PAYS      AS PAYS_ORIGINE,
                tp.ACTIF,
                df.NOM_FOURNISSEUR AS VRAI_NOM_FOURNISSEUR
            FROM dim_produit dp
            LEFT JOIN dim_besoin   db ON dp.CODE_BESOIN  = db.CODE_BESOIN
            LEFT JOIN table_produit tp ON dp.CODE_PRODUIT = tp.CODE_PRODUIT
            LEFT JOIN dim_fournisseur df ON tp.FRS = df.CODE_FOURNISSEUR
            WHERE dp.CODE_PRODUIT = ? LIMIT 1
        `, [code]);
        if (rows.length > 0) res.json(rows[0]);
        else res.status(404).json({ error: 'Produit non trouvé' });
    } catch (error) {
        logQueryError('/produit/:code', error, [code]);
        res.status(500).json({ error: 'Database error', detail: error.message });
    }
});

// 3. PRODUITS LIÉS AU MÊME BESOIN
router.get('/produits-par-besoin/:codeBesoin', async (req, res) => {
    const { codeBesoin } = req.params;
    const latestStockSubquery = `(SELECT STOCK_TOTAL FROM fact_mouvements WHERE CODE_PRODUIT = dp.CODE_PRODUIT ORDER BY ANNEE DESC, MOIS DESC LIMIT 1)`;

    try {
        const [rows] = await pool.execute(`
            SELECT
                dp.CODE_PRODUIT, dp.LIBELLE, dp.CODE_BESOIN,
                dp.NOM_FOURNISSEUR, dp.PRESENTATION, dp.SIGLE,
                dp.VEIC, dp.QUARANTAINE, dp.QTE_BLOQUEE, dp.ETATPRODUIT,
                ROUND(COALESCE(${latestStockSubquery}, 0), 0) AS STOCK,
                ROUND(COALESCE(${latestStockSubquery}, 0) * (CAST(COALESCE(dp.PRESENTATIONNB, 1) AS DECIMAL) / NULLIF(COALESCE(db.PRESENTATIONTYPE, 1), 0)), 0) AS STOCK_CONVERTI
            FROM dim_produit dp
            INNER JOIN dim_besoin db ON dp.CODE_BESOIN = db.CODE_BESOIN
            WHERE dp.CODE_BESOIN = ? LIMIT 100
        `, [codeBesoin]);

        if (rows.length > 0) {
            const [history] = await pool.execute(`
                SELECT CODE_PRODUIT, ANNEE, MOIS, VENTE_TOTAL
                FROM fact_mouvements
                WHERE CODE_PRODUIT IN (SELECT CODE_PRODUIT FROM dim_produit WHERE CODE_BESOIN = ?)
                ORDER BY ANNEE DESC, MOIS DESC
            `, [codeBesoin]);

            const historyMap = {};
            history.forEach(h => {
                (historyMap[h.CODE_PRODUIT] = historyMap[h.CODE_PRODUIT] || []).push({
                    annee: h.ANNEE, mois: h.MOIS, vente: Number(h.VENTE_TOTAL) || 0,
                });
            });

            const calcMM = (pHistory, months) => {
                const sliced = pHistory.slice(0, months);
                return sliced.length > 0 ? sliced.reduce((acc, c) => acc + c.vente, 0) / Math.min(months, pHistory.length) : 0;
            };

            rows.forEach(p => {
                const pHistory = historyMap[p.CODE_PRODUIT] || [];
                const oldest = pHistory[pHistory.length - 1];
                p.PREMIERE_FACTURE = oldest ? `${oldest.annee}-${String(oldest.mois).padStart(2, '0')}` : '-';
                p.MM3  = calcMM(pHistory, 3);
                p.MM6  = calcMM(pHistory, 6);
                p.MM12 = calcMM(pHistory, 12);
                p.ETAT = p.ETATPRODUIT || 'Actif';
            });
        }

        res.json(rows);
    } catch (error) {
        logQueryError('/produits-par-besoin', error, [codeBesoin]);
        res.status(500).json({ error: 'Database error', detail: error.message });
    }
});

// 4. RÉSUMÉ STOCK PAR PRODUIT
router.get('/stock-summary/:codeProduit', async (req, res) => {
    const { codeProduit } = req.params;
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM fact_mouvements WHERE CODE_PRODUIT = ? ORDER BY ANNEE DESC, MOIS DESC LIMIT 1',
            [codeProduit]
        );
        const row = rows[0] || {};
        const DEPOTS = ['National', 'Réserve', 'Tunis', 'Sousse', 'Sfax', 'Medenine', 'Gafsa', 'Kef'];
        const result = DEPOTS.map(depot => ({
            depot,
            totalStock: depot === 'National' ? (row.STOCK_TOTAL || 0) : getRegionStockSumFromRow(depot, row),
            totalVente: depot === 'National' ? (row.VENTE_TOTAL || 0) : getRegionVenteSumFromRow(depot, row),
        }));
        correctNational(result);
        res.json(result);
    } catch (error) {
        logQueryError('/stock-summary', error, [codeProduit]);
        res.status(500).json({ error: 'Database error', detail: error.message });
    }
});

// Helper to build stock-details SQL
const buildStockDetailsSql = (whereField, filterByDepot, regionName) => {
    const regionKey = regionName ? regionName.toUpperCase().replace('É', 'E') : 'NATIONAL';
    
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
            IF(sd.DATEPEREMP IS NULL OR sd.DATEPEREMP = '', '-', CONCAT('01-01-', CAST(ROUND(sd.DATEPEREMP) AS CHAR))) AS DATEPEREMP,
            sd.QUANTITET      AS STOCK,
            sd.QTE_BLOQUEE,
            sd.QUARANTAINE,
            (SELECT ANNEE FROM fact_mouvements WHERE CODE_PRODUIT = sd.CODE_PRODUIT ORDER BY ANNEE DESC, MOIS DESC LIMIT 1) AS ANNEE,
            (SELECT STOCK_TOTAL FROM fact_mouvements WHERE CODE_PRODUIT = sd.CODE_PRODUIT ORDER BY ANNEE DESC, MOIS DESC LIMIT 1) AS STOCK_TOTAL,
            (SELECT VENTE_TOTAL FROM fact_mouvements WHERE CODE_PRODUIT = sd.CODE_PRODUIT ORDER BY ANNEE DESC, MOIS DESC LIMIT 1) AS VENTE_TOTAL,
            (SELECT STOCK_REGION FROM stock_region_produit WHERE CODE_PRODUIT = sd.CODE_PRODUIT AND REGION = ${targetRegion} ORDER BY ANNEE DESC, MOIS DESC LIMIT 1) AS STOCK_REGION,
            (SELECT VENTE_REGION FROM stock_region_produit WHERE CODE_PRODUIT = sd.CODE_PRODUIT AND REGION = ${targetRegion} ORDER BY ANNEE DESC, MOIS DESC LIMIT 1) AS VENTE_REGION
        FROM stock_depot sd
        INNER JOIN dim_produit dp ON sd.CODE_PRODUIT = dp.CODE_PRODUIT
        WHERE ${whereField} = ?
    `;
    if (filterByDepot) sql += ` AND sd.LIBELLE_DEPOT IN (${filterByDepot.map(() => '?').join(', ')})`;
    return sql;
};

// 5. DÉTAILS STOCK PAR PRODUIT
router.get('/stock-details/:codeProduit/:depot', async (req, res) => {
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
});

// 5b. DÉTAILS STOCK PAR BESOIN
router.get('/stock-details-besoin/:codeBesoin/:depot', async (req, res) => {
    const { codeBesoin, depot } = req.params;
    const targetDepots = depotNameGroups[depot];
    let sql = buildStockDetailsSql('dp.CODE_BESOIN', depot !== 'National' ? targetDepots : null, depot);
    sql += ' ORDER BY sd.DATEPEREMP ASC';
    const params = [codeBesoin, ...(depot !== 'National' && targetDepots ? targetDepots : [])];
    try {
        const [rows] = await pool.execute(sql, params);
        res.json(rows);
    } catch (error) {
        logQueryError(`/stock-details-besoin/${codeBesoin}/${depot}`, error, params);
        res.status(500).json({ error: 'Erreur lors du chargement des détails de stock (Besoin)', detail: error.message });
    }
});

// 6. RÉSUMÉ STOCK PAR BESOIN
router.get('/stock-summary-besoin/:codeBesoin', async (req, res) => {
    const { codeBesoin } = req.params;
    try {
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
});

// 7. STATS PAR PRODUIT
router.get('/stats/:codeProduit', async (req, res) => {
    const { codeProduit } = req.params;
    try {
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
        const [results] = await pool.query(`
            SELECT MOIS, STOCK_REGION AS totalStock, VENTE_REGION AS totalVente
            FROM stock_region_produit
            WHERE CODE_PRODUIT = ? AND REGION = 'NATIONAL'
              AND ANNEE = (SELECT ANNEE FROM stock_region_produit WHERE CODE_PRODUIT = ? ORDER BY ANNEE DESC LIMIT 1)
            ORDER BY MOIS ASC;
            
            SELECT * FROM fact_mouvements WHERE CODE_PRODUIT = ? ORDER BY ANNEE DESC, MOIS DESC LIMIT 1;
        `, [codeProduit, codeProduit, codeProduit]);

        const months = results[0];
        const row = results[1][0] || {};
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
});

// 8. STATS PAR BESOIN
router.get('/stats-besoin/:codeBesoin', async (req, res) => {
    const { codeBesoin } = req.params;
    try {
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
});

// 8.5. LIVRAISONS PAR BESOIN
router.get('/livraisons-besoin/:codeBesoin', async (req, res) => {
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
});

// 9. COMPARAISON DE RÉGIONS
router.get('/compare-regions', async (req, res) => {
    const { code, isBesoin, regionA, regionB, months } = req.query;
    const numMonths = parseInt(months) || 12;
    const isBesoinSearch = isBesoin === 'true';

    const getRegionData = async (reg) => {
        if (isBesoinSearch) {
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
        const [rowsA, rowsB] = await Promise.all([getRegionData(regionA), getRegionData(regionB)]);
        res.json([...rowsA, ...rowsB].sort((a, b) => (b.ANNEE * 100 + b.MOIS) - (a.ANNEE * 100 + a.MOIS)));
    } catch (error) {
        logQueryError('/compare-regions', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// 10. COMPARAISON AVANCÉE
router.get('/compare-regions-advanced', async (req, res) => {
    const { code, isBesoin, region1, op1, val1, region2, op2, val2, historyMonths } = req.query;
    const isBesoinSearch = isBesoin === 'true';
    const months = parseInt(historyMonths) || 6;
    const threshold1 = parseFloat(val1) || 0;
    const threshold2 = parseFloat(val2) || 0;

    const ALLOWED_OPS = ['<', '>', '<=', '>=', '='];
    const safeOp1 = ALLOWED_OPS.includes(op1) ? op1 : '<';
    const safeOp2 = ALLOWED_OPS.includes(op2) ? op2 : '<';

    const codeFilter = isBesoinSearch ? 'CODE_BESOIN = ?' : 'CODE_PRODUIT = ?';
    const fields1 = getRegionFields(region1);
    const fields2 = getRegionFields(region2);
    const vteCols1 = getVenteColsFromReg(region1);
    const vteCols2 = getVenteColsFromReg(region2);

    try {
        const sql = `
            SELECT
                dp.CODE_PRODUIT AS code,
                dp.LIBELLE      AS libelle,
                latest.st1      AS stock1,
                latest.st2      AS stock2,
                history.mm1,
                history.mm2,
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
});

// SITUATION & ALERTES — Prédictions ML
const { 
    calculateMetrics, 
    formatCriticalNeeds, 
    calculateHubsHealth, 
    getGlobalStatus 
} = require('../utils/predictionUtils');

router.get('/situation/predictions', async (req, res) => {
    const { hubId, period = '3' } = req.query;
    const p   = parseInt(period, 10);
    const hub = (hubId || '').toUpperCase().trim();
    const cacheKey = `sit_${hub || 'NAT'}_${p}`;

    // 1. Cache RAM (< 2ms)
    const cached = predCache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
        // 2. Query predictions
        let sql = `
            SELECT hub_id, code_besoin, label_besoin, periode_mois, 
                   prediction_couverture, risque_rupture_prob, rupture_predite, 
                   trend, days_to_stockout, 
                   COALESCE(stock_predit, 0) AS stock_predit, 
                   COALESCE(cmm_utilisee, 0) AS mm_utilisee 
            FROM ml_predictions_cache 
            WHERE periode_mois = ? 
              AND label_besoin NOT LIKE '%DIVERS%' 
              AND label_besoin NOT LIKE '%divers%'
        `;
        let params = [p];
        if (hub && hub !== 'NATIONAL') {
            sql += ` AND hub_id = ?`;
            params.push(hub);
        }
        sql += ` ORDER BY prediction_couverture ASC, risque_rupture_prob DESC`;

        const [rows] = await pool.execute(sql, params);

        if (!rows.length) {
            return res.json({
                metrics: { adequacy: 0, stockouts: 0, gaps: 0 },
                criticalNeeds: [],
                hubsHealth: [],
                hubHealth: 'unknown',
                message: 'Données prédictives non disponibles'
            });
        }

        // 3. Process data using utilities
        const metrics = calculateMetrics(rows);
        const response = {
            metrics,
            criticalNeeds: formatCriticalNeeds(rows),
            hubsHealth: calculateHubsHealth(rows),
            hubHealth: getGlobalStatus(metrics.adequacy)
        };

        predCache.set(cacheKey, response);
        res.json(response);

    } catch (err) {
        logQueryError('/situation/predictions', err, [p, hub]);
        res.status(500).json({ error: 'Erreur prédictions ML', detail: err.message });
    }
});

module.exports = router;
