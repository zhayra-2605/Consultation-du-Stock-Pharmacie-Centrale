/**
 * controllers/productController.js
 * Contrôleur pour la gestion des produits.
 * Responsabilité : Rechercher des produits ou des besoins, afficher les fiches détaillées et calculer les statistiques de vente (MM3, MM6, MM12).
 */

const { pool, logQueryError } = require('../utils/db');

/**
 * Moteur de recherche multicritère.
 * Permet de chercher par Code Produit, Libellé, Code Besoin ou Libellé Besoin.
 */
const search = async (req, res) => {
    const { critere, valeur } = req.query;
    const val = (valeur || '').trim();

    // Sécurité : on vérifie que le critère est autorisé
    const ALLOWED = ['Code Produit', 'Libellé Produit', 'Code Besoin', 'Libellé Besoin'];
    if (!ALLOWED.includes(critere)) {
        return res.status(400).json({ error: 'Critère de recherche invalide' });
    }

    let sql;
    const params = [];
    try {
        // --- CAS 1 : Recherche par BESOIN (Regroupement) ---
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
        } 
        // --- CAS 2 : Recherche par PRODUIT spécifique ---
        else {
            const column = critere === 'Code Produit' ? 'CODE_PRODUIT' : 'LIBELLE';
            sql = `
                WITH MatchingProducts AS (
                    SELECT CODE_PRODUIT FROM dim_produit WHERE ${column} LIKE ?
                ),
                LatestMouvement AS (
                    -- On récupère seulement le dernier mouvement connu pour chaque produit
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
                    -- Calcul du stock converti (en boîtes/unités standards)
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
};

/**
 * Récupère toutes les informations d'un seul produit (Fiche détaillée).
 */
const getProduit = async (req, res) => {
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
};

/**
 * Liste tous les produits qui appartiennent au même Besoin et calcule leurs moyennes de vente.
 */
const getProduitsParBesoin = async (req, res) => {
    const { codeBesoin } = req.params;
    // Sous-requête pour le dernier stock connu
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
            // Récupération de l'historique des ventes pour calculer les moyennes mobiles
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

            // Fonction interne pour calculer la moyenne sur N mois
            const calcMM = (pHistory, months) => {
                const sliced = pHistory.slice(0, months);
                return sliced.length > 0 ? sliced.reduce((acc, c) => acc + c.vente, 0) / Math.min(months, pHistory.length) : 0;
            };

            // Enrichissement de chaque produit avec ses statistiques
            rows.forEach(p => {
                const pHistory = historyMap[p.CODE_PRODUIT] || [];
                const oldest = pHistory[pHistory.length - 1];
                p.PREMIERE_FACTURE = oldest ? `${oldest.annee}-${String(oldest.mois).padStart(2, '0')}` : '-';
                p.MM3  = calcMM(pHistory, 3); // Moyenne Mobile sur 3 mois
                p.MM6  = calcMM(pHistory, 6); // Moyenne Mobile sur 6 mois
                p.MM12 = calcMM(pHistory, 12); // Moyenne Mobile sur 12 mois
                p.ETAT = p.ETATPRODUIT || 'Actif';
            });
        }

        res.json(rows);
    } catch (error) {
        logQueryError('/produits-par-besoin', error, [codeBesoin]);
        res.status(500).json({ error: 'Database error', detail: error.message });
    }
};

module.exports = {
    search,
    getProduit,
    getProduitsParBesoin
};

