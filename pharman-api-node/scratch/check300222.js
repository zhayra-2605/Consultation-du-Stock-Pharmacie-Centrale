const mysql = require('mysql2/promise');

async function test() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'pharmacie_centrale'
    });

    try {
        const [mouvements] = await pool.execute(`SELECT * FROM fact_mouvements WHERE CODE_PRODUIT = '300222'`);
        console.log('Mouvements:', mouvements.length);
        if (mouvements.length > 0) {
            console.log('First:', mouvements[0]);
        }

        const [stock] = await pool.execute(`SELECT * FROM stock_depot WHERE CODE_PRODUIT = '300222'`);
        console.log('Stock depot:', stock.length);
        if (stock.length > 0) {
            console.log('Stock depot details:');
            stock.forEach(s => console.log(`${s.LIBELLE_DEPOT}: ${s.QUANTITET}`));
        }
    } catch (err) {
        console.error(err);
    }
    process.exit();
}

test();
