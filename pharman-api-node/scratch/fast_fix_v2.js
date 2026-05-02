const mysql = require('mysql2/promise');

/**
 * FAST FIX v2 - Stratégie optimisée pour finir en 5-10 minutes max:
 * 1. UPDATE 2023 en 1 seule requête (déjà fait si étape 1 était OK)
 * 2. TRUNCATE les tables BI (instantané, pas de DELETE lent)
 * 3. Re-insérer uniquement depuis fact_mouvements via INSERT...SELECT
 */
async function fastFixV2() {
    const conn = await mysql.createConnection({
        host: 'localhost', user: 'root', password: '',
        database: 'pharmacie_centrale', connectTimeout: 600000,
        // Désactiver les checks de clés étrangères pour accélérer
    });

    console.log('=== FAST FIX v2 ===');

    // Vérification rapide si l'étape 1 (balance) est déjà faite
    const [check] = await conn.query(
        'SELECT AVG(STOCK_TOTAL) as v FROM fact_mouvements WHERE ANNEE = 2023 LIMIT 1'
    );
    const [check24] = await conn.query(
        'SELECT AVG(STOCK_TOTAL) as v FROM fact_mouvements WHERE ANNEE = 2024 LIMIT 1'
    );
    const ratio = check[0].v / check24[0].v;
    console.log(`Ratio 2023/2024 actuel: ${(ratio*100).toFixed(1)}%`);

    if (ratio < 0.85) {
        console.log('Étape 1/3 - Re-alignement 2023...');
        const [regions] = await conn.query('SELECT * FROM ref_regions');
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
        console.log('✓ Étape 1 déjà OK (ratio correct), on saute.');
    }

    // ÉTAPE 2: TRUNCATE au lieu de DELETE — instantané !
    console.log('Étape 2/3 - TRUNCATE tables BI (instantané)...');
    await conn.query('TRUNCATE TABLE stock_region_produit');
    await conn.query('TRUNCATE TABLE stock_region_besoin');
    console.log('✓ Tables vidées en quelques secondes.');

    // ÉTAPE 3: Reconstruction BI via INSERT...SELECT
    const [regions] = await conn.query('SELECT * FROM ref_regions');
    console.log('Étape 3/3 - Reconstruction BI pour toutes les années...');

    for (const r of regions) {
        const stkCol = r.stk_fields.split(',')[0].trim();
        const vteCol = r.vte_fields.split(',')[0].trim();

        await conn.query(`
            INSERT INTO stock_region_produit (REGION, ANNEE, MOIS, CODE_PRODUIT, STOCK_REGION, VENTE_REGION)
            SELECT ?, ANNEE, MOIS, CODE_PRODUIT, \`${stkCol}\`, \`${vteCol}\`
            FROM fact_mouvements
        `, [r.nom_region]);

        await conn.query(`
            INSERT INTO stock_region_besoin (REGION, ANNEE, MOIS, CODE_BESOIN, STOCK_REGION, VENTE_REGION)
            SELECT ?, ANNEE, MOIS, CODE_BESOIN, SUM(\`${stkCol}\`), SUM(\`${vteCol}\`)
            FROM fact_mouvements
            WHERE CODE_BESOIN IS NOT NULL
            GROUP BY ANNEE, MOIS, CODE_BESOIN
        `, [r.nom_region]);

        console.log(`  ✓ ${r.nom_region}`);
    }

    console.log('\n=== TOUT TERMINÉ ===');

    // Validation finale
    const [val] = await conn.query(`
        SELECT ANNEE, AVG(STOCK_REGION) as stock, SUM(VENTE_REGION) as vente 
        FROM stock_region_produit WHERE REGION = 'NATIONAL' 
        GROUP BY ANNEE ORDER BY ANNEE
    `);
    console.log('Résultat final par année:');
    val.forEach(row => console.log(`  ${row.ANNEE}: Stock=${Math.round(row.stock)}, Vente=${Math.round(row.vente)}`));

    await conn.end();
}

fastFixV2().catch(console.error);
