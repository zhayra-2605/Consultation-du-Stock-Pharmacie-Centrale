const mysql = require('mysql2/promise');

async function test() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'pharmacie_centrale'
    });

    console.time('NOT_EQUAL');
    await pool.execute(`
        SELECT ANNEE, SUM(STOCK_REGION) as totalStock, SUM(VENTE_REGION) as totalVente 
        FROM stock_region_besoin 
        WHERE CODE_BESOIN = '2-5243' AND REGION != 'NATIONAL' 
        GROUP BY ANNEE ORDER BY ANNEE DESC
    `);
    console.timeEnd('NOT_EQUAL');

    console.time('IN_CLAUSE');
    await pool.execute(`
        SELECT ANNEE, SUM(STOCK_REGION) as totalStock, SUM(VENTE_REGION) as totalVente 
        FROM stock_region_besoin 
        WHERE CODE_BESOIN = '2-5243' AND REGION IN ('SFAX', 'SOUSSE', 'GAFSA', 'KEF', 'MEDENINE', 'RÉSERVE', 'TUNIS') 
        GROUP BY ANNEE ORDER BY ANNEE DESC
    `);
    console.timeEnd('IN_CLAUSE');

    console.time('RAW_BESOIN');
    await pool.execute(`
        SELECT ANNEE, SUM(STOCK_REGION) as totalStock, SUM(VENTE_REGION) as totalVente 
        FROM stock_region_besoin 
        WHERE CODE_BESOIN = '2-5243'
        GROUP BY ANNEE ORDER BY ANNEE DESC
    `);
    console.timeEnd('RAW_BESOIN');

    process.exit();
}

test();
