const mysql = require('mysql2/promise');

const config = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pharmacie_centrale'
};

async function checkData() {
    console.log('Connecting to database...');
    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('Connected!');

        console.log('\n--- Unique LIBELLE_DEPOT in stock_depot ---');
        const [depots] = await connection.execute('SELECT DISTINCT LIBELLE_DEPOT FROM stock_depot');
        console.log(JSON.stringify(depots.map(d => d.LIBELLE_DEPOT), null, 2));

        console.log('\n--- Sample rows from stock_depot ---');
        const [samples] = await connection.execute('SELECT * FROM stock_depot LIMIT 2');
        console.log(JSON.stringify(samples, null, 2));

        console.log('\n--- Checking count for specific mapping: Tunis ---');
        const tunisDepots = ['COMMANDE FERME', 'COMPTOIR', 'DEPOT SERUM', 'DEPOT VACCINS DE SOUKRA', 'DISTRIPHAR', 'TUDIPHARMA'];
        const [tunisCheck] = await connection.execute(`SELECT COUNT(*) as count FROM stock_depot WHERE LIBELLE_DEPOT IN (${tunisDepots.map(() => '?').join(',')})`, tunisDepots);
        console.log(`Count for Tunis depots: ${tunisCheck[0].count}`);

    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        if (connection) await connection.end();
    }
}

checkData();
