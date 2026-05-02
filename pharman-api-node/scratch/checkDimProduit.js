const mysql = require('mysql2/promise');

async function checkDim() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'pharmacie_centrale'
    });

    try {
        const [rows] = await pool.execute(`SELECT * FROM dim_produit LIMIT 1`);
        if (rows.length > 0) {
            console.log("Found properties:");
            console.log(Object.keys(rows[0]));
        } else {
            console.log("No products found.");
        }
    } catch (err) {
        console.error(err);
    }
    process.exit();
}

checkDim();
