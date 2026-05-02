const mysql = require('mysql2/promise');

async function test() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'pharmacie_centrale'
    });

    try {
        const [cols] = await pool.execute(`SHOW COLUMNS FROM table_produit`);
        console.log("table_produit columns:", cols.map(c => c.Field));
    } catch (err) {
        console.error(err);
    }
    process.exit();
}

test();
