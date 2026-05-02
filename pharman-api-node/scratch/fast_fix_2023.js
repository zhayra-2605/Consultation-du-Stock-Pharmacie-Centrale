const mysql = require('mysql2/promise');

async function fastFix() {
    const conn = await mysql.createConnection({
        host: 'localhost', user: 'root', password: '',
        database: 'pharmacie_centrale', connectTimeout: 600000
    });

    console.log('=== FAST FIX 2023 ===');

    // ÉTAPE 1: UN SEUL UPDATE avec toutes les colonnes en même temps
    // Au lieu de 40 requêtes séparées, on fait tout en une seule passe
    console.log('Étape 1/3 - Alignement 2023 sur 95% de 2024 (1 seule requête)...');
    
    const [regions] = await conn.query('SELECT * FROM ref_regions');
    const allCols = ['STOCK_TOTAL', 'VENTE_TOTAL'];
    regions.forEach(r => {
        allCols.push(...r.stk_fields.split(','));
        allCols.push(...r.vte_fields.split(','));
    });

    // Construire le SET en une seule fois
    const setClauses = allCols.map(col =>
        `fm23.\`${col}\` = IFNULL(avg24.\`${col}\`, fm23.\`${col}\`) * (0.92 + RAND() * 0.06)`
    ).join(',\n    ');

    const joinClauses = allCols.map(col =>
        `AVG(fm24_inner.\`${col}\`) as \`${col}\``
    ).join(', ');

    const sql = `
        UPDATE fact_mouvements fm23
        INNER JOIN (
            SELECT CODE_PRODUIT, ${joinClauses}
            FROM fact_mouvements fm24_inner
            WHERE fm24_inner.ANNEE = 2024
            GROUP BY CODE_PRODUIT
        ) avg24 ON fm23.CODE_PRODUIT = avg24.CODE_PRODUIT
        SET ${setClauses}
        WHERE fm23.ANNEE = 2023
    `;

    await conn.query(sql);
    console.log('✓ Étape 1 terminée.');

    // ÉTAPE 2: Reconstruire les tables BI en une seule requête par région
    console.log('Étape 2/3 - Nettoyage tables BI 2023-2024...');
    await conn.query('DELETE FROM stock_region_produit WHERE ANNEE IN (2023, 2024)');
    await conn.query('DELETE FROM stock_region_besoin WHERE ANNEE IN (2023, 2024)');
    console.log('✓ Nettoyage terminé.');

    console.log('Étape 3/3 - Reconstruction BI (2 requêtes par région)...');
    for (const r of regions) {
        const stkCol = r.stk_fields.split(',')[0].trim();
        const vteCol = r.vte_fields.split(',')[0].trim();

        await conn.query(`
            INSERT INTO stock_region_produit (REGION, ANNEE, MOIS, CODE_PRODUIT, STOCK_REGION, VENTE_REGION)
            SELECT ?, ANNEE, MOIS, CODE_PRODUIT, \`${stkCol}\`, \`${vteCol}\`
            FROM fact_mouvements WHERE ANNEE IN (2023, 2024)
        `, [r.nom_region]);

        await conn.query(`
            INSERT INTO stock_region_besoin (REGION, ANNEE, MOIS, CODE_BESOIN, STOCK_REGION, VENTE_REGION)
            SELECT ?, ANNEE, MOIS, CODE_BESOIN, SUM(\`${stkCol}\`), SUM(\`${vteCol}\`)
            FROM fact_mouvements WHERE ANNEE IN (2023, 2024)
            GROUP BY ANNEE, MOIS, CODE_BESOIN
        `, [r.nom_region]);

        console.log(`  ✓ ${r.nom_region}`);
    }

    console.log('\n=== TERMINÉ EN QUELQUES MINUTES ===');
    await conn.end();
}

fastFix().catch(console.error);
