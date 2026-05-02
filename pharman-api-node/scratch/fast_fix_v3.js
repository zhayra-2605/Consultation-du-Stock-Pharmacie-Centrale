const mysql = require('mysql2/promise');

async function fastFixV3() {
    const conn = await mysql.createConnection({
        host: 'localhost', user: 'root', password: '',
        database: 'pharmacie_centrale', connectTimeout: 600000
    });

    console.log('=== FAST FIX v3 ===');
    const [regions] = await conn.query('SELECT * FROM ref_regions');

    // ÉTAPE 1: Vérifier si le balance 2023 est déjà OK
    const [c23] = await conn.query('SELECT AVG(STOCK_TOTAL) as v FROM fact_mouvements WHERE ANNEE = 2023');
    const [c24] = await conn.query('SELECT AVG(STOCK_TOTAL) as v FROM fact_mouvements WHERE ANNEE = 2024');
    const ratio = c23[0].v / c24[0].v;
    console.log(`Ratio 2023/2024: ${(ratio*100).toFixed(1)}%`);

    if (ratio < 0.85) {
        console.log('Étape 1/3 - Balance 2023 (1 seule requête)...');
        const allCols = ['STOCK_TOTAL', 'VENTE_TOTAL'];
        regions.forEach(r => {
            allCols.push(...r.stk_fields.split(',').map(c=>c.trim()));
            allCols.push(...r.vte_fields.split(',').map(c=>c.trim()));
        });
        const setClauses = allCols.map(col =>
            `fm23.\`${col}\` = IFNULL(avg24.\`${col}\`, 0) * (0.92 + RAND() * 0.06)`
        ).join(', ');
        const joinClauses = allCols.map(col =>
            `AVG(fm24_inner.\`${col}\`) as \`${col}\``
        ).join(', ');
        await conn.query(`
            UPDATE fact_mouvements fm23
            INNER JOIN (
                SELECT CODE_PRODUIT, ${joinClauses}
                FROM fact_mouvements fm24_inner WHERE fm24_inner.ANNEE = 2024
                GROUP BY CODE_PRODUIT
            ) avg24 ON fm23.CODE_PRODUIT = avg24.CODE_PRODUIT
            SET ${setClauses}
            WHERE fm23.ANNEE = 2023
        `);
        console.log('✓ Étape 1 terminée.');
    } else {
        console.log('✓ Étape 1 déjà OK, skip.');
    }

    // ÉTAPE 2: TRUNCATE (instantané)
    console.log('Étape 2/3 - TRUNCATE tables BI...');
    await conn.query('TRUNCATE TABLE stock_region_produit');
    await conn.query('TRUNCATE TABLE stock_region_besoin');
    console.log('✓ Tables vidées.');

    // ÉTAPE 3: Rebuild avec le bon champ db_key comme REGION
    console.log('Étape 3/3 - Reconstruction BI...');
    for (const r of regions) {
        const regionKey = r.db_key;  // ← Correction : db_key au lieu de nom_region
        const stkCol = r.stk_fields.split(',')[0].trim();
        const vteCol = r.vte_fields.split(',')[0].trim();

        process.stdout.write(`  ${regionKey}... `);

        await conn.query(`
            INSERT INTO stock_region_produit (REGION, ANNEE, MOIS, CODE_PRODUIT, STOCK_REGION, VENTE_REGION)
            SELECT ?, ANNEE, MOIS, CODE_PRODUIT, \`${stkCol}\`, \`${vteCol}\`
            FROM fact_mouvements
        `, [regionKey]);

        await conn.query(`
            INSERT INTO stock_region_besoin (REGION, ANNEE, MOIS, CODE_BESOIN, STOCK_REGION, VENTE_REGION)
            SELECT ?, ANNEE, MOIS, CODE_BESOIN, SUM(\`${stkCol}\`), SUM(\`${vteCol}\`)
            FROM fact_mouvements
            WHERE CODE_BESOIN IS NOT NULL
            GROUP BY ANNEE, MOIS, CODE_BESOIN
        `, [regionKey]);

        console.log('OK');
    }

    // Région NATIONAL (somme de tout)
    console.log('  NATIONAL...');
    await conn.query(`
        INSERT INTO stock_region_produit (REGION, ANNEE, MOIS, CODE_PRODUIT, STOCK_REGION, VENTE_REGION)
        SELECT 'NATIONAL', ANNEE, MOIS, CODE_PRODUIT, STOCK_TOTAL, VENTE_TOTAL
        FROM fact_mouvements
    `);
    await conn.query(`
        INSERT INTO stock_region_besoin (REGION, ANNEE, MOIS, CODE_BESOIN, STOCK_REGION, VENTE_REGION)
        SELECT 'NATIONAL', ANNEE, MOIS, CODE_BESOIN, SUM(STOCK_TOTAL), SUM(VENTE_TOTAL)
        FROM fact_mouvements
        WHERE CODE_BESOIN IS NOT NULL
        GROUP BY ANNEE, MOIS, CODE_BESOIN
    `);
    console.log('OK');

    console.log('\n=== TERMINÉ ===');

    // Validation
    const [val] = await conn.query(`
        SELECT ANNEE, ROUND(AVG(STOCK_REGION)) as stock, ROUND(SUM(VENTE_REGION)) as vente
        FROM stock_region_produit WHERE REGION = 'NATIONAL'
        GROUP BY ANNEE ORDER BY ANNEE
    `);
    console.log('\nRésultat final:');
    val.forEach(row => console.log(`  ${row.ANNEE}: Stock=${row.stock}, Vente=${row.vente}`));

    await conn.end();
}

fastFixV3().catch(console.error);
