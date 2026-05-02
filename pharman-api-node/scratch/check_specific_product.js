const mysql = require('mysql2/promise');

async function checkProduct() {
    const conn = await mysql.createConnection({
        host: 'localhost', user: 'root', password: '',
        database: 'pharmacie_centrale'
    });

    // 1. Trouver le produit de la capture (Vente 2023 ~14631)
    const [rows] = await conn.query(`
        SELECT CODE_PRODUIT, SUM(VENTE_REGION) as v 
        FROM stock_region_produit 
        WHERE ANNEE = 2023 AND REGION = 'NATIONAL' 
        GROUP BY CODE_PRODUIT 
        HAVING v >= 14630 AND v <= 14632
    `);

    if (rows.length === 0) {
        console.log("Produit non trouvé avec vente=14631 en 2023.");
    } else {
        const code = rows[0].CODE_PRODUIT;
        console.log(`Produit identifié : ${code}`);

        // 2. Vérifier toutes les années pour ce produit
        const [history] = await conn.query(`
            SELECT ANNEE, SUM(STOCK_REGION) as stock, SUM(VENTE_REGION) as vente 
            FROM stock_region_produit 
            WHERE CODE_PRODUIT = ? AND REGION = 'NATIONAL' 
            GROUP BY ANNEE
        `, [code]);
        
        console.log('\nHistorique dans le Dashboard :');
        history.forEach(h => console.log(`  ${h.ANNEE}: Stock=${h.stock}, Vente=${h.vente}`));

        // 3. Vérifier dans la table source (fact_mouvements)
        const [source] = await conn.query(`
            SELECT ANNEE, SUM(STOCK_TOTAL) as s, SUM(VENTE_TOTAL) as v 
            FROM fact_mouvements 
            WHERE CODE_PRODUIT = ? 
            GROUP BY ANNEE
        `, [code]);
        console.log('\nHistorique dans la Source :');
        source.forEach(s => console.log(`  ${s.ANNEE}: Stock=${s.s}, Vente=${s.v}`));
    }

    await conn.end();
}

checkProduct().catch(console.error);
