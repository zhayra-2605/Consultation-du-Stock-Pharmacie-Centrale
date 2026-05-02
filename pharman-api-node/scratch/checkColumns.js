const mysql = require('mysql2/promise');

async function test() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'pharmacie_centrale'
    });

    try {
        const [tables] = await pool.execute(`SHOW TABLES`);
        console.log("Tables:");
        for (let row of tables) {
            const tableName = Object.values(row)[0];
            const [cols] = await pool.execute(`SHOW COLUMNS FROM ${tableName}`);
            const colNames = cols.map(c => c.Field);
            if (colNames.includes('DESCRIPTION') || colNames.includes('AMM') || colNames.includes('STUP')) {
                console.log(`${tableName} contains some of the target columns: `, colNames.filter(c => ['DESCRIPTION', 'AMM', 'STUP', 'PSYCHO', 'DATECREATION'].includes(c)));
            }
        }
    } catch (err) {
        console.error(err);
    }
    process.exit();
}

test();
