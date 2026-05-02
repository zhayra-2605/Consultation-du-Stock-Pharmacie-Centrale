const mysql = require('mysql2/promise');

async function testHistory() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'pharmacie_centrale'
    });

    try {
        console.time('History');
        const [rows] = await pool.execute(`
            SELECT CODE_PRODUIT, ANNEE, MOIS, VENTE_TOTAL 
            FROM fact_mouvements 
            WHERE CODE_PRODUIT IN (SELECT CODE_PRODUIT FROM dim_produit WHERE CODE_BESOIN = '2-5243')
            ORDER BY CODE_PRODUIT, ANNEE DESC, MOIS DESC
        `);
        console.timeEnd('History');
        console.log(`Fetched ${rows.length} rows.`);
    } catch (err) {
        console.error(err);
    }
    process.exit();
}

testHistory();
