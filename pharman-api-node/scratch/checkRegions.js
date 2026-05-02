const mysql = require('mysql2/promise');

async function test() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'pharmacie_centrale'
    });

    try {
        const [rows] = await pool.execute(`SELECT DISTINCT REGION FROM stock_region_besoin WHERE CODE_BESOIN = '2-5243'`);
        console.log('Regions:', rows);
    } catch (err) {
        console.error(err);
    }
    process.exit();
}

test();
