const mysql = require('mysql2/promise');
const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'pharmacie_centrale' });

async function check() {
    try {
        const HUB_IDS = ['TUNIS', 'SFAX', 'SOUSSE', 'GAFSA', 'KEF', 'MEDENINE'];
        
        console.log('\n=== HEATMAP CORRIGEE — Logique API Actuelle ===');
        console.log('(adequacy = % de produits avec couverture >= 30%)\n');

        for (const hub of HUB_IDS) {
            const [rows] = await pool.execute(`
                SELECT prediction_couverture, rupture_predite
                FROM ml_predictions_cache
                WHERE periode_mois = 3 AND hub_id = ?
                  AND label_besoin NOT LIKE '%DIVERS%'
            `, [hub]);
            
            const total = rows.length;
            const stable = rows.filter(r => Number(r.prediction_couverture) >= 30).length;
            const adequacy = Math.round((stable / total) * 100);
            const status = adequacy < 30 ? '🔴 CRITIQUE' : adequacy < 70 ? '🟡 WARNING' : '🟢 STABLE';
            
            const ruptures = rows.filter(r => Number(r.rupture_predite) === 1).length;
            
            console.log(`  ${hub.padEnd(10)} : ${status} (adequacy=${adequacy}%, ruptures=${ruptures}/${total})`);
        }

        // Top 10 avec stock_predit et cmm
        console.log('\n=== TOP 10 — Avec Stock Predit + CMM ===');
        const [top10] = await pool.execute(`
            SELECT label_besoin, prediction_couverture, rupture_predite,
                   risque_rupture_prob, stock_predit, cmm_utilisee, days_to_stockout
            FROM ml_predictions_cache
            WHERE periode_mois = 3 AND label_besoin NOT LIKE '%DIVERS%'
            ORDER BY prediction_couverture ASC
            LIMIT 10
        `);
        top10.forEach((r, i) => {
            const rupt = Number(r.rupture_predite);
            const cov  = Number(r.prediction_couverture);
            const color = rupt === 1 ? 'ROUGE' : cov < 30 ? 'ORANGE' : 'VERT';
            console.log(`  ${i+1}. [${color}] cov=${cov.toFixed(1)}% stock=${Math.round(r.stock_predit)} cmm=${Math.round(r.cmm_utilisee)} | ${r.label_besoin.substring(0,50)}`);
        });

        process.exit(0);
    } catch(err) {
        console.error(err.message);
        process.exit(1);
    }
}
check();
