const mysql = require('mysql2/promise');

async function check() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'pharmacie_centrale'
    });

    console.log('--- CHECK PRODUCT 103054 (NATIONAL) ---');
    const [r] = await connection.query("SELECT ANNEE, MOIS, STOCK_REGION, VENTE_REGION FROM stock_region_produit WHERE CODE_PRODUIT = '103054' AND REGION = 'NATIONAL' ORDER BY ANNEE, MOIS");
    console.table(r);
    await connection.end();
}

check().catch(console.error);
