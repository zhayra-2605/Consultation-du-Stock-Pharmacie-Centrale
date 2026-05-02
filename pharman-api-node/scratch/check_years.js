const mysql = require('mysql2/promise');

async function check() {
    const conn = await mysql.createConnection({
        host: 'localhost', user: 'root', password: '',
        database: 'pharmacie_centrale'
    });

    console.log('--- VÉRIFICATION DES ANNÉES DISPONIBLES ---');

    const [fm] = await conn.query('SELECT ANNEE, COUNT(*) as nb FROM fact_mouvements GROUP BY ANNEE ORDER BY ANNEE');
    console.log('\nTable SOURCE (fact_mouvements) :');
    if (fm.length === 0) console.log('  VIDE !');
    fm.forEach(r => console.log(`  Année ${r.ANNEE} : ${r.nb} lignes`));

    const [bi] = await conn.query("SELECT ANNEE, COUNT(*) as nb FROM stock_region_produit WHERE REGION = 'NATIONAL' GROUP BY ANNEE ORDER BY ANNEE");
    console.log('\nTable DASHBOARD (stock_region_produit) :');
    if (bi.length === 0) console.log('  VIDE !');
    bi.forEach(r => console.log(`  Année ${r.ANNEE} : ${r.nb} lignes`));

    await conn.end();
}

check().catch(console.error);
