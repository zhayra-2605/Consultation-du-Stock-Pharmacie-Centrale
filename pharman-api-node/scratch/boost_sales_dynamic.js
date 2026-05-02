const mysql = require('mysql2/promise');

async function boostSales() {
    const conn = await mysql.createConnection({
        host: 'localhost', user: 'root', password: '',
        database: 'pharmacie_centrale', connectTimeout: 600000
    });

    console.log('1. Boost des ventes dans fact_mouvements (x3 environ)...');
    const [regions] = await conn.query('SELECT * FROM ref_regions');
    
    let updateSql = 'UPDATE fact_mouvements SET VENTE_TOTAL = VENTE_TOTAL * (2.7 + RAND() * 0.6)';
    for (const r of regions) {
        const vteCols = r.vte_fields.split(',').map(c => c.trim());
        for (const col of vteCols) {
            updateSql += `, \`${col}\` = \`${col}\` * (2.7 + RAND() * 0.6)`;
        }
    }
    await conn.query(updateSql);

    console.log('2. Vidage des tables BI...');
    await conn.query('TRUNCATE TABLE stock_region_produit');
    await conn.query('TRUNCATE TABLE stock_region_besoin');

    console.log('3. Reconstruction Produits (National + Régions)...');
    // National
    await conn.query(`
        INSERT INTO stock_region_produit (REGION, ANNEE, MOIS, CODE_PRODUIT, STOCK_REGION, VENTE_REGION)
        SELECT 'NATIONAL', ANNEE, MOIS, CODE_PRODUIT, STOCK_TOTAL, VENTE_TOTAL FROM fact_mouvements
    `);
    
    // Regions
    for (const r of regions) {
        process.stdout.write(`   ${r.db_key}... `);
        const stk = r.stk_fields.split(',')[0].trim();
        const vte = r.vte_fields.split(',')[0].trim();
        await conn.query(`
            INSERT INTO stock_region_produit (REGION, ANNEE, MOIS, CODE_PRODUIT, STOCK_REGION, VENTE_REGION)
            SELECT ?, ANNEE, MOIS, CODE_PRODUIT, \`${stk}\`, \`${vte}\` FROM fact_mouvements
        `, [r.db_key]);
        console.log('OK');
    }

    console.log('4. Reconstruction Besoins (National)...');
    await conn.query(`
        INSERT INTO stock_region_besoin (REGION, ANNEE, MOIS, CODE_BESOIN, STOCK_REGION, VENTE_REGION)
        SELECT 'NATIONAL', ANNEE, MOIS, CODE_BESOIN, SUM(STOCK_TOTAL), SUM(VENTE_TOTAL) 
        FROM fact_mouvements WHERE CODE_BESOIN IS NOT NULL GROUP BY ANNEE, MOIS, CODE_BESOIN
    `);

    console.log('\n--- BOOST ET SYNCHRO TERMINÉS ---');
    await conn.end();
}

boostSales().catch(console.error);
