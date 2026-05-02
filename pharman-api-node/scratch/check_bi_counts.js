const mysql = require('mysql2/promise');

async function check() {
    const conn = await mysql.createConnection({
        host: 'localhost', user: 'root', password: '',
        database: 'pharmacie_centrale'
    });

    const [rows] = await conn.query("SELECT ANNEE, COUNT(*) as nb FROM stock_region_produit WHERE REGION = 'NATIONAL' GROUP BY ANNEE ORDER BY ANNEE");
    console.log('État actuel du Dashboard (National) :');
    rows.forEach(r => console.log(`  Année ${r.ANNEE} : ${r.nb} lignes`));

    await conn.end();
}

check().catch(console.error);
