const mysql = require('mysql2/promise');
const queries = require('../scripts/etl/sql_queries');

async function fix() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'pharmacie_centrale',
        multipleStatements: true
    });

    console.log('--- RÉGÉNÉRATION ANALYTIQUE (Séquentielle) ---');
    
    // Split the createAnalyticsTables string into individual statements
    // The statements are separated by ; 
    const statements = queries.createAnalyticsTables.split(';').map(s => s.trim()).filter(s => s.length > 0);
    
    for (const stmt of statements) {
        const title = stmt.substring(0, 50).replace(/\n/g, ' ') + '...';
        console.log(`Exécution : ${title}`);
        try {
            await connection.query(stmt);
            console.log('  OK.');
        } catch (err) {
            console.error(`  ERREUR : ${err.message}`);
        }
    }

    console.log('\n--- ANALYTIQUE TERMINÉE ---');
    await connection.end();
}

fix();
