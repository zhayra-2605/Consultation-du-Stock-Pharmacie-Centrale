const mysql = require('mysql2/promise');

async function checkBesoin() {
    const conn = await mysql.createConnection({
        host: 'localhost', user: 'root', password: '',
        database: 'pharmacie_centrale'
    });

    console.log('--- RECHERCHE DU BESOIN (Vente=14631) ---');

    const [rows] = await conn.query(`
        SELECT CODE_BESOIN, SUM(STOCK_REGION) as s, SUM(VENTE_REGION) as v 
        FROM stock_region_besoin 
        WHERE ANNEE = 2023 AND REGION = 'NATIONAL' 
        GROUP BY CODE_BESOIN 
        HAVING v >= 14630 AND v <= 14632
    `);

    if (rows.length === 0) {
        console.log("Besoin non trouvé.");
    } else {
        const code = rows[0].CODE_BESOIN;
        const stock = rows[0].s;
        console.log(`Besoin identifié : ${code} (Stock: ${stock}, Vente: ${rows[0].v})`);

        // Vérifier historique
        const [history] = await conn.query(`
            SELECT ANNEE, SUM(STOCK_REGION) as stock, SUM(VENTE_REGION) as vente 
            FROM stock_region_besoin 
            WHERE CODE_BESOIN = ? AND REGION = 'NATIONAL' 
            GROUP BY ANNEE
        `, [code]);
        
        console.log('\nHistorique Dashboard :');
        history.forEach(h => console.log(`  ${h.ANNEE}: Stock=${h.stock}, Vente=${h.vente}`));
    }

    await conn.end();
}

checkBesoin().catch(console.error);
