const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pharmacie_centrale',
    multipleStatements: true
};

async function inspect() {
    const connection = await mysql.createConnection(dbConfig);
    try {
        console.log('--- Database Inspection ---');
        
        const tables = ['fact_mouvements', 'stock_region_besoin', 'stock_region_produit', 'dim_produit', 'dim_besoin'];
        
        for (const table of tables) {
            console.log(`\nTable: ${table}`);
            const [columns] = await connection.query(`SHOW COLUMNS FROM ${table}`);
            console.table(columns.map(c => ({ Field: c.Field, Type: c.Type, Null: c.Null, Key: c.Key })));
            
            const [indexes] = await connection.query(`SHOW INDEX FROM ${table}`);
            console.table(indexes.map(i => ({ Table: i.Table, Non_unique: i.Non_unique, Key_name: i.Key_name, Column_name: i.Column_name })));
        }

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

inspect();
