/**
 * controllers/predictionController.js
 * Contrôleur pour la récupération des prédictions générées par l'IA (Python).
 * Responsabilité : Lire les résultats mis en cache dans la DB et fournir les indicateurs de santé des stocks.
 */

const { pool, logQueryError } = require('../utils/db');
const NodeCache = require('node-cache');
const { 
    calculateMetrics, 
    formatCriticalNeeds, 
    calculateHubsHealth, 
    getGlobalStatus 
} = require('../utils/predictionUtils');

// Utilisation d'un cache mémoire (RAM) pour éviter de recalculer les indicateurs 
// si plusieurs utilisateurs consultent le dashboard simultanément.
const predCache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 }); // Expire après 24h

/**
 * Récupère la situation globale et les alertes de rupture basées sur les prédictions.
 */
const getSituationPredictions = async (req, res) => {
    const { hubId, period = '3' } = req.query; // Période de prédiction (ex: 3 mois)
    const p   = parseInt(period, 10);
    const hub = (hubId || '').toUpperCase().trim();
    const cacheKey = `sit_${hub || 'NAT'}_${p}`;

    // 1. On vérifie d'abord si le résultat est déjà en cache mémoire
    const cached = predCache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
        // 2. On récupère les données brutes depuis la table de cache remplie par le moteur Python
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

        // 3. Transformation des données brutes en indicateurs visuels (via predictionUtils)
        const metrics = calculateMetrics(rows);
        const response = {
            metrics,
            criticalNeeds: formatCriticalNeeds(rows), // Top des besoins critiques
            hubsHealth: calculateHubsHealth(rows),   // État de santé de chaque région
            hubHealth: getGlobalStatus(metrics.adequacy) // Statut global (Couverture)
        };

        // Enregistrement dans le cache pour les prochains appels
        predCache.set(cacheKey, response);
        res.json(response);

    } catch (err) {
        logQueryError('/situation/predictions', err, [p, hub]);
        res.status(500).json({ error: 'Erreur prédictions ML', detail: err.message });
    }
};

module.exports = {
    getSituationPredictions
};

