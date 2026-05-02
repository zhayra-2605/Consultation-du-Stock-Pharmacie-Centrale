const mysql = require('mysql2/promise');

async function optimizeDB() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'pharmacie_centrale'
    });

    try {
        console.log("Checking indexes on stock_region_besoin...");
        const [indexesSRB] = await pool.execute(`SHOW INDEX FROM stock_region_besoin`);
        const hasCodeBesoinIndexSRB = indexesSRB.some(idx => idx.Column_name === 'CODE_BESOIN');
        
        if (!hasCodeBesoinIndexSRB) {
            console.log("Adding index on CODE_BESOIN for stock_region_besoin...");
            await pool.query(`ALTER TABLE stock_region_besoin ADD INDEX idx_code_besoin (CODE_BESOIN)`);
            console.log("Index added!");
        } else {
            console.log("Index already exists on stock_region_besoin.");
        }

        console.log("Checking indexes on fact_mouvements...");
        const [indexesFM] = await pool.execute(`SHOW INDEX FROM fact_mouvements`);
        const hasCodeProduitIndexFM = indexesFM.some(idx => idx.Column_name === 'CODE_PRODUIT');
        
        if (!hasCodeProduitIndexFM) {
            console.log("Adding index on CODE_PRODUIT for fact_mouvements...");
            await pool.query(`ALTER TABLE fact_mouvements ADD INDEX idx_code_produit (CODE_PRODUIT)`);
            console.log("Index added!");
        } else {
            console.log("Index already exists on fact_mouvements.");
        }

    } catch (err) {
        console.error(err);
    }
    process.exit();
}

optimizeDB();
