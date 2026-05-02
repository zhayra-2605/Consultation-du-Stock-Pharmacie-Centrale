const mysql = require('mysql2/promise');

async function fixRegions() {
    const conn = await mysql.createConnection({
        host: 'localhost', user: 'root', password: '',
        database: 'pharmacie_centrale', connectTimeout: 600000
    });

    console.log('1. Nettoyage des anciennes données régionales (incomplètes)...');
    await conn.query(`DELETE FROM stock_region_produit WHERE REGION != 'NATIONAL'`);
    await conn.query(`DELETE FROM stock_region_besoin WHERE REGION != 'NATIONAL'`);

    console.log('2. Reconstruction complète par région (Somme de tous les dépôts)...');
    const [regions] = await conn.query('SELECT * FROM ref_regions');
    
    for (const r of regions) {
        // Build the sum expressions dynamically, handling NULL values
        const stkCols = r.stk_fields.split(',').map(c => `IFNULL(\`${c.trim()}\`, 0)`).join(' + ');
        const vteCols = r.vte_fields.split(',').map(c => `IFNULL(\`${c.trim()}\`, 0)`).join(' + ');
        
        process.stdout.write(`   ${r.db_key}... `);
        
        // Reconstruction Produits
        await conn.query(`
            INSERT INTO stock_region_produit (REGION, ANNEE, MOIS, CODE_PRODUIT, STOCK_REGION, VENTE_REGION)
            SELECT ?, ANNEE, MOIS, CODE_PRODUIT, (${stkCols}), (${vteCols}) 
            FROM fact_mouvements
        `, [r.db_key]);
        
        // Reconstruction Besoins
        await conn.query(`
            INSERT INTO stock_region_besoin (REGION, ANNEE, MOIS, CODE_BESOIN, STOCK_REGION, VENTE_REGION)
            SELECT ?, ANNEE, MOIS, CODE_BESOIN, SUM(${stkCols}), SUM(${vteCols}) 
            FROM fact_mouvements 
            WHERE CODE_BESOIN IS NOT NULL 
            GROUP BY ANNEE, MOIS, CODE_BESOIN
        `, [r.db_key]);
        
        console.log('OK');
    }

    console.log('\n--- RÉGIONS RÉPARÉES ET SYNCHRONISÉES ---');
    await conn.end();
}

fixRegions().catch(console.error);
