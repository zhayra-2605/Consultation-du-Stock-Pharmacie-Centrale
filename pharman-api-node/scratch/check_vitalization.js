const mysql = require('mysql2/promise');

async function test() {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'pharmacie_centrale'
        });

        const [rows] = await conn.query('SHOW COLUMNS FROM fact_mouvements LIKE ?', ['DISPATCH_TYPE']);
        console.log(rows.length > 0 ? 'Column exists' : 'Column missing');

        const [rows2] = await conn.query('SELECT DISPATCH_TYPE, COUNT(*) as count FROM fact_mouvements GROUP BY DISPATCH_TYPE');
        console.log('Stats:', rows2);

        await conn.end();
    } catch (err) {
        console.error(err);
    }
}

test();
