const mysql = require('mysql2/promise');

async function check() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'pharmacie_centrale'
    });

    console.log('Checking stock_region_produit years for NATIONAL...');
    const [r] = await connection.query(`
        SELECT ANNEE, COUNT(*) as nb 
        FROM stock_region_produit 
        WHERE REGION = 'NATIONAL' 
        GROUP BY ANNEE
    `);
    console.log(JSON.stringify(r));
    await connection.end();
}

check();
