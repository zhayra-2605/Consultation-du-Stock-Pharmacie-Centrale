const mysql = require('mysql2/promise');

async function test() {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'pharmacie_centrale'
        });

        console.log('--- Database Check ---');
        
        const [tables] = await conn.query('SHOW TABLES');
        console.log('Tables:', tables.map(t => Object.values(t)[0]));

        if (tables.some(t => Object.values(t)[0] === 'fact_mouvements')) {
            const [count] = await conn.query('SELECT COUNT(*) as c FROM fact_mouvements');
            console.log('fact_mouvements count:', count[0].c);
        } else {
            console.log('fact_mouvements MISSING!');
        }

        await conn.end();
    } catch (err) {
        console.error(err);
    }
}

test();
