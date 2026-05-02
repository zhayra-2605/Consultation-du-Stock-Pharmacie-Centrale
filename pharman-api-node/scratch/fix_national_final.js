const mysql = require('mysql2/promise');

async function fixNational() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'pharmacie_centrale',
        connectTimeout: 60000 // Increase timeout
    });

    console.log('--- REPAIRING NATIONAL ANALYTICS ---');
    
    // Clean up first to avoid duplicates
    await connection.query("DELETE FROM stock_region_produit WHERE REGION = 'NATIONAL'");
    console.log('Old National data cleared.');

    console.log('Inserting NATIONAL data into stock_region_produit (1.6M rows)...');
    await connection.query(`
        INSERT INTO stock_region_produit (ANNEE, MOIS, CODE_PRODUIT, REGION, STOCK_REGION, VENTE_REGION)
        SELECT ANNEE, MOIS, CODE_PRODUIT, 'NATIONAL', STOCK_TOTAL, VENTE_TOTAL 
        FROM fact_mouvements
    `);
    console.log('National Products OK.');

    await connection.query("DELETE FROM stock_region_besoin WHERE REGION = 'NATIONAL'");
    console.log('Inserting NATIONAL data into stock_region_besoin...');
    await connection.query(`
        INSERT INTO stock_region_besoin (ANNEE, MOIS, CODE_BESOIN, REGION, STOCK_REGION, VENTE_REGION)
        SELECT ANNEE, MOIS, CODE_BESOIN, 'NATIONAL', SUM(STOCK_TOTAL), SUM(VENTE_TOTAL)
        FROM fact_mouvements 
        GROUP BY ANNEE, MOIS, CODE_BESOIN
    `);
    console.log('National Besoins OK.');

    console.log('Creating Indexes...');
    try {
        await connection.query('CREATE INDEX idx_srp_nat ON stock_region_produit(CODE_PRODUIT, REGION)');
    } catch(e) { console.log('Index maybe exists or error: ' + e.message); }

    console.log('--- NATIONAL REPAIR COMPLETED ---');
    await connection.end();
}

fixNational().catch(console.error);
