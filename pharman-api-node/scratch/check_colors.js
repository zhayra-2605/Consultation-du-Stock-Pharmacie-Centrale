const mysql = require('mysql2/promise');
const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'pharmacie_centrale' });

async function check() {
    try {
        // 1. Distribution couleurs Top 10 (période=3, national)
        const [top10] = await pool.execute(`
            SELECT code_besoin, label_besoin, hub_id,
                   prediction_couverture, risque_rupture_prob, rupture_predite, trend,
                   COALESCE(stock_predit, 0) AS stock_predit,
                   COALESCE(cmm_utilisee, 0) AS cmm_utilisee
            FROM ml_predictions_cache
            WHERE periode_mois = 3
              AND label_besoin NOT LIKE '%DIVERS%'
            ORDER BY prediction_couverture ASC, risque_rupture_prob DESC
            LIMIT 10
        `);

        console.log('\n=== TOP 10 BESOINS CRITIQUES — Distribution Couleurs ===');
        top10.forEach((r, i) => {
            const rupt = Number(r.rupture_predite);
            const cov  = Number(r.prediction_couverture);
            const color = rupt === 1 ? '🔴 ROUGE (Rupture)' : cov < 30 ? '🟡 ORANGE (Risque)' : '🟢 VERT (Stable)';
            console.log(`${i+1}. [${color}] cov=${cov.toFixed(1)}% | risque=${(Number(r.risque_rupture_prob)*100).toFixed(1)}% | ${r.label_besoin.substring(0,40)}`);
        });

        // 2. Distribution globale des couleurs (période=3)
        const [distrib] = await pool.execute(`
            SELECT
                SUM(CASE WHEN rupture_predite = 1 THEN 1 ELSE 0 END) AS rouge,
                SUM(CASE WHEN rupture_predite = 0 AND prediction_couverture < 30 THEN 1 ELSE 0 END) AS orange,
                SUM(CASE WHEN rupture_predite = 0 AND prediction_couverture >= 30 THEN 1 ELSE 0 END) AS vert,
                COUNT(*) AS total
            FROM ml_predictions_cache
            WHERE periode_mois = 3 AND label_besoin NOT LIKE '%DIVERS%'
        `);
        const d = distrib[0];
        console.log('\n=== DISTRIBUTION GLOBALE (Période 3 mois) ===');
        console.log(`🔴 Rouge (Rupture)  : ${d.rouge} / ${d.total} (${(d.rouge/d.total*100).toFixed(1)}%)`);
        console.log(`🟡 Orange (Risque)  : ${d.orange} / ${d.total} (${(d.orange/d.total*100).toFixed(1)}%)`);
        console.log(`🟢 Vert (Stable)    : ${d.vert} / ${d.total} (${(d.vert/d.total*100).toFixed(1)}%)`);

        // 3. Santé des 6 Hubs (carte géo)
        const HUB_IDS = ['TUNIS', 'SFAX', 'SOUSSE', 'GAFSA', 'KEF', 'MEDENINE'];
        console.log('\n=== HEATMAP — Santé par Hub (Carte) ===');
        for (const hub of HUB_IDS) {
            const [rows] = await pool.execute(`
                SELECT AVG(prediction_couverture) as avg_cov, COUNT(*) as n
                FROM ml_predictions_cache
                WHERE periode_mois = 3 AND hub_id = ? AND label_besoin NOT LIKE '%DIVERS%'
            `, [hub]);
            const avg = Number(rows[0].avg_cov) || 0;
            const status = avg < 30 ? '🔴 CRITIQUE' : avg < 70 ? '🟡 WARNING' : '🟢 STABLE';
            console.log(`  ${hub.padEnd(10)} : ${status} (adequacy=${avg.toFixed(1)}%)`);
        }

        // 4. Vérification valeurs couverture (min/max/avg)
        const [stats] = await pool.execute(`
            SELECT MIN(prediction_couverture) as min_cov, MAX(prediction_couverture) as max_cov,
                   AVG(prediction_couverture) as avg_cov, STDDEV(prediction_couverture) as std_cov
            FROM ml_predictions_cache
            WHERE periode_mois = 3 AND label_besoin NOT LIKE '%DIVERS%'
        `);
        const s = stats[0];
        console.log('\n=== STATISTIQUES COUVERTURE ===');
        console.log(`  Min : ${Number(s.min_cov).toFixed(2)}%`);
        console.log(`  Max : ${Number(s.max_cov).toFixed(2)}%`);
        console.log(`  Avg : ${Number(s.avg_cov).toFixed(2)}%`);
        console.log(`  Std : ${Number(s.std_cov).toFixed(2)}%`);

        process.exit(0);
    } catch(err) {
        console.error(err.message);
        process.exit(1);
    }
}
check();
