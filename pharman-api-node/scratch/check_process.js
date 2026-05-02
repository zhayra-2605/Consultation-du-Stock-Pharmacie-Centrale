const mysql = require('mysql2/promise');

async function test() {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'pharmacie_centrale'
        });

        const [rows] = await conn.query('SHOW FULL PROCESSLIST');
        console.table(rows);
        
        await conn.end();
    } catch (err) {
        console.error(err);
    }
}

test();
