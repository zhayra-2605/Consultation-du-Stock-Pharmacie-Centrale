const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'c:/wamp64/www/Pharmacie Centrale/pharman-api-node/.env' });

async function checkData() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'pharmacie_centrale'
    });

    try {
        console.log('--- Unique LIBELLE_DEPOT ---');
        const [depots] = await connection.execute('SELECT DISTINCT LIBELLE_DEPOT FROM stock_depot');
        console.log(depots.map(d => d.LIBELLE_DEPOT));

        console.log('\n--- Sample data from stock_region_besoin ---');
        const [regions] = await connection.execute('SELECT DISTINCT REGION FROM stock_region_besoin');
        console.log(regions.map(r => r.REGION));

        console.log('\n--- Check Sfax mapping ---');
        const sfaxDepots = ['CEPHARMA HOPITAUX SFAX', 'CEPHARMA PUBLIC - SFAX -'];
        const [sfaxCheck] = await connection.execute(`SELECT COUNT(*) as count FROM stock_depot WHERE LIBELLE_DEPOT IN (?, ?)`, sfaxDepots);
        console.log(`Count for Sfax depots: ${sfaxCheck[0].count}`);

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

checkData();
