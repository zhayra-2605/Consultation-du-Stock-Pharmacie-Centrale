const mysql = require('mysql2/promise');

async function test() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'pharmacie_centrale',
    });

    try {
        console.log('--- ref_regions ---');
        const [regions] = await pool.execute('SELECT * FROM ref_regions');
        console.table(regions);

        console.log('\n--- fact_mouvements sample for 300222 ---');
        const [mvt] = await pool.execute('SELECT * FROM fact_mouvements WHERE CODE_PRODUIT = "300222" ORDER BY ANNEE DESC, MOIS DESC LIMIT 1');
        console.log(JSON.stringify(mvt[0], null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

test();
