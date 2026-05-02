const mysql = require('mysql2/promise');

async function fix2026Sales() {
    const conn = await mysql.createConnection({
        host: 'localhost', user: 'root', password: '',
        database: 'pharmacie_centrale', connectTimeout: 600000
    });

    console.log('1. Ajustement des ventes pour 2026 (68% à 85% du stock)...');
    const [regions] = await conn.query('SELECT * FROM ref_regions');
    
    let updateSql = 'UPDATE fact_mouvements SET VENTE_TOTAL = STOCK_TOTAL * (0.68 + RAND() * 0.17)';
    for (const r of regions) {
        const stkCols = r.stk_fields.split(',').map(c => c.trim());
        const vteCols = r.vte_fields.split(',').map(c => c.trim());
        for (let i = 0; i < vteCols.length; i++) {
            const vte = vteCols[i];
            const stk = stkCols[i] || stkCols[0]; // Pair the sales column with its stock column
            updateSql += `, \`${vte}\` = \`${stk}\` * (0.68 + RAND() * 0.17)`;
        }
    }
    updateSql += ' WHERE ANNEE = 2026'; // ONLY 2026
    await conn.query(updateSql);

    console.log('2. Nettoyage des tables BI uniquement pour 2026...');
    await conn.query('DELETE FROM stock_region_produit WHERE ANNEE = 2026');
    await conn.query('DELETE FROM stock_region_besoin WHERE ANNEE = 2026');

    console.log('3. Reconstruction Produits pour 2026...');
    // National
    await conn.query(`
        INSERT INTO stock_region_produit (REGION, ANNEE, MOIS, CODE_PRODUIT, STOCK_REGION, VENTE_REGION)
        SELECT 'NATIONAL', ANNEE, MOIS, CODE_PRODUIT, STOCK_TOTAL, VENTE_TOTAL 
        FROM fact_mouvements WHERE ANNEE = 2026
    `);
    
    // Regions
    for (const r of regions) {
        process.stdout.write(`   ${r.db_key} (Produits)... `);
        const stkColsSum = r.stk_fields.split(',').map(c => `IFNULL(\`${c.trim()}\`, 0)`).join(' + ');
        const vteColsSum = r.vte_fields.split(',').map(c => `IFNULL(\`${c.trim()}\`, 0)`).join(' + ');
        
        await conn.query(`
            INSERT INTO stock_region_produit (REGION, ANNEE, MOIS, CODE_PRODUIT, STOCK_REGION, VENTE_REGION)
            SELECT ?, ANNEE, MOIS, CODE_PRODUIT, (${stkColsSum}), (${vteColsSum}) 
            FROM fact_mouvements WHERE ANNEE = 2026
        `, [r.db_key]);
        console.log('OK');
    }

    console.log('4. Reconstruction Besoins pour 2026...');
    // National
    await conn.query(`
        INSERT INTO stock_region_besoin (REGION, ANNEE, MOIS, CODE_BESOIN, STOCK_REGION, VENTE_REGION)
        SELECT 'NATIONAL', ANNEE, MOIS, CODE_BESOIN, SUM(STOCK_TOTAL), SUM(VENTE_TOTAL) 
        FROM fact_mouvements WHERE CODE_BESOIN IS NOT NULL AND ANNEE = 2026 
        GROUP BY ANNEE, MOIS, CODE_BESOIN
    `);

    // Regions
    for (const r of regions) {
        process.stdout.write(`   ${r.db_key} (Besoins)... `);
        const stkColsSum = r.stk_fields.split(',').map(c => `IFNULL(\`${c.trim()}\`, 0)`).join(' + ');
        const vteColsSum = r.vte_fields.split(',').map(c => `IFNULL(\`${c.trim()}\`, 0)`).join(' + ');
        
        await conn.query(`
            INSERT INTO stock_region_besoin (REGION, ANNEE, MOIS, CODE_BESOIN, STOCK_REGION, VENTE_REGION)
            SELECT ?, ANNEE, MOIS, CODE_BESOIN, SUM(${stkColsSum}), SUM(${vteColsSum}) 
            FROM fact_mouvements 
            WHERE CODE_BESOIN IS NOT NULL AND ANNEE = 2026
            GROUP BY ANNEE, MOIS, CODE_BESOIN
        `, [r.db_key]);
        console.log('OK');
    }

    console.log('\n--- CORRECTION 2026 TERMINÉE ---');
    await conn.end();
}

fix2026Sales().catch(console.error);
