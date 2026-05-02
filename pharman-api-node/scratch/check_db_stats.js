const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pharmacie_centrale'
};

async function check() {
    const pool = mysql.createPool(dbConfig);
    
    try {
        const [sum24] = await pool.query(`SELECT SUM(STOCK_TOTAL) as st, SUM(VENTE_TOTAL) as vt FROM fact_mouvements WHERE ANNEE = 2024`);
        console.log('2024 sum:', sum24[0]);

        const [sum25] = await pool.query(`SELECT SUM(STOCK_TOTAL) as st, SUM(VENTE_TOTAL) as vt FROM fact_mouvements WHERE ANNEE = 2025`);
        console.log('2025 sum:', sum25[0]);

        const [sum26] = await pool.query(`SELECT SUM(STOCK_TOTAL) as st, SUM(VENTE_TOTAL) as vt FROM fact_mouvements WHERE ANNEE = 2026`);
        console.log('2026 sum:', sum26[0]);

        const [sum23] = await pool.query(`SELECT SUM(STOCK_TOTAL) as st, SUM(VENTE_TOTAL) as vt FROM fact_mouvements WHERE ANNEE = 2023`);
        console.log('2023 sum:', sum23[0]);

        const [reg] = await pool.query(`SELECT REGION, SUM(STOCK_REGION) as st, SUM(VENTE_REGION) as vt FROM stock_region_besoin GROUP BY REGION`);
        console.log('Regions:', reg);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
