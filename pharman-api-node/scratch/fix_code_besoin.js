const mysql = require('mysql2/promise');

async function fix() {
    const conn = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'pharmacie_centrale'
    });

    try {
        console.log('--- Fixing NULL CODE_BESOIN in fact_mouvements ---');
        
        const [res] = await conn.query(`
            UPDATE fact_mouvements hm
            LEFT JOIN dim_produit dp ON hm.CODE_PRODUIT = dp.CODE_PRODUIT
            SET hm.CODE_BESOIN = dp.CODE_BESOIN
            WHERE hm.CODE_BESOIN IS NULL OR hm.CODE_BESOIN = ''
        `);
        
        console.log(`Updated ${res.affectedRows} rows.`);
        console.log('--- Fix Complete ---');
    } catch (err) {
        console.error(err);
    } finally {
        await conn.end();
    }
}

fix();
