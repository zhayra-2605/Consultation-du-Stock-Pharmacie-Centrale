const mysql = require('mysql2/promise');

async function restore() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'pharmacie_centrale'
    });

    console.log('--- RESTAURATION BI ÉCLAIR (NATIONAL SEUL) ---');
    
    // TRUNCATE is safer and faster than DELETE
    await connection.query('TRUNCATE TABLE stock_region_produit');
    await connection.query('TRUNCATE TABLE stock_region_besoin');
    console.log('Tables nettoyées.');

    // 1. National Products (1.6M rows)
    console.log('Insertion National Produits (Total)...');
    await connection.query(`
        INSERT INTO stock_region_produit (ANNEE, MOIS, CODE_PRODUIT, REGION, STOCK_REGION, VENTE_REGION)
        SELECT ANNEE, MOIS, CODE_PRODUIT, 'NATIONAL', STOCK_TOTAL, VENTE_TOTAL 
        FROM fact_mouvements
    `);

    // 2. National Besoins
    console.log('Insertion National Besoins...');
    await connection.query(`
        INSERT INTO stock_region_besoin (ANNEE, MOIS, CODE_BESOIN, REGION, STOCK_REGION, VENTE_REGION)
        SELECT ANNEE, MOIS, CODE_BESOIN, 'NATIONAL', SUM(STOCK_TOTAL), SUM(VENTE_TOTAL)
        FROM fact_mouvements 
        GROUP BY ANNEE, MOIS, CODE_BESOIN
    `);

    console.log('--- BI NATIONAL PRÊT ---');
    await connection.end();
}

restore();
