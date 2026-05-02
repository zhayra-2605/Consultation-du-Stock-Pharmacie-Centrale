const mysql = require('mysql2/promise');

async function getStats() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'pharmacie_centrale'
    });

    console.log('--- CONTENT ANALYSIS: BASE DATA ---');
    
    // 1. Overview
    const [counts] = await connection.query('SELECT COUNT(*) as nb FROM dim_produit');
    console.log(`Nombre total de produits (Base) : ${counts[0].nb}`);

    // 2. Stock Ranges
    const [stockStats] = await connection.query(`
        SELECT 
            MIN(STOCK_TOTAL) as min_stk, 
            MAX(STOCK_TOTAL) as max_stk, 
            AVG(STOCK_TOTAL) as avg_stk,
            STDDEV(STOCK_TOTAL) as std_stk
        FROM fact_mouvements 
        WHERE STOCK_TOTAL > 0
    `);
    console.log('\n--- STOCK TOTAL (Valeurs positives) ---');
    console.log(`Min : ${stockStats[0].min_stk}`);
    console.log(`Max : ${stockStats[0].max_stk}`);
    console.log(`Avg : ${Math.round(stockStats[0].avg_stk)}`);

    // 3. Ventes Ranges
    const [venteStats] = await connection.query(`
        SELECT 
            MIN(VENTE_TOTAL) as min_vte, 
            MAX(VENTE_TOTAL) as max_vte, 
            AVG(VENTE_TOTAL) as avg_vte
        FROM fact_mouvements 
        WHERE VENTE_TOTAL > 0
    `);
    console.log('\n--- Ventes TOTAL (Valeurs positives) ---');
    console.log(`Min : ${venteStats[0].min_vte}`);
    console.log(`Max : ${venteStats[0].max_vte}`);
    console.log(`Avg : ${Math.round(venteStats[0].avg_vte)}`);

    // 4. Regional Breakdown (Top 3 Regions)
    console.log('\n--- ANALYSE PAR RÉGION (Moyenne Stock/Vente) ---');
    const [regStats] = await connection.query(`
        SELECT REGION, 
               ROUND(AVG(STOCK_REGION)) as avg_stk, 
               ROUND(AVG(VENTE_REGION)) as avg_vte
        FROM stock_region_produit 
        GROUP BY REGION 
        ORDER BY avg_stk DESC
    `);
    regStats.forEach(r => {
        console.log(`${r.REGION.padEnd(10)} : Stock Moy ~${r.avg_stk} | Vente Moy ~${r.avg_vte}`);
    });

    // 5. Monthly Volatility (Analysis of the last available year)
    console.log('\n--- ANALYSE PAR MOIS (Saisonnalité/Volatilité) ---');
    const [latestYearRow] = await connection.query('SELECT MAX(ANNEE) as max_year FROM fact_mouvements');
    const lyr = latestYearRow[0].max_year;
    const [monthStats] = await connection.query(`
        SELECT MOIS, 
               ROUND(AVG(STOCK_TOTAL)) as avg_stk, 
               ROUND(AVG(VENTE_TOTAL)) as avg_vte
        FROM fact_mouvements 
        WHERE ANNEE = ?
        GROUP BY MOIS 
        ORDER BY MOIS
    `, [lyr]);
    console.log(`Données pour l'année : ${lyr}`);
    monthStats.forEach(m => {
        console.log(`Mois ${String(m.MOIS).padStart(2, '0')} : Stock ~${m.avg_stk} | Ventes ~${m.avg_vte}`);
    });

    // 6. Enrichment Thresholds per Region
    console.log('\n--- LOGIQUE D\'ENRICHISSEMENT PAR RÉGION (Valeurs Typiques) ---');
    console.log('Région   | Seuil Alerte (Stock) | Seuil Surstock (Stock)');
    regStats.filter(r => r.REGION !== 'NATIONAL').forEach(r => {
        const alerte = Math.round(r.avg_vte * 1.5);
        const surstock = Math.round(r.avg_vte * 8);
        console.log(`${r.REGION.padEnd(8)} | ${String(alerte).padEnd(20)} | ${String(surstock).padEnd(20)}`);
    });

    await connection.end();
}

getStats().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
