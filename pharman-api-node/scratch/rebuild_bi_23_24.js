const mysql = require('mysql2/promise');

async function rebuild() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'pharmacie_centrale',
        connectTimeout: 600000
    });

    console.log('--- RECONSTRUCTION BI CIBLÉE (2023-2024) ---');

    // Nettoyage
    console.log('Nettoyage 2023-2024...');
    await connection.query('DELETE FROM stock_region_produit WHERE ANNEE IN (2023, 2024)');
    await connection.query('DELETE FROM stock_region_besoin WHERE ANNEE IN (2023, 2024)');

    const [regions] = await connection.query('SELECT * FROM ref_regions');

    // Insertion Produits
    for (const r of regions) {
        console.log(`Produits [${r.nom_region}]...`);
        const stkCol = r.stk_fields.split(',')[0];
        const vteCol = r.vte_fields.split(',')[0];
        
        await connection.query(`
            INSERT INTO stock_region_produit (REGION, ANNEE, MOIS, CODE_PRODUIT, STOCK_REGION, VENTE_REGION)
            SELECT ?, ANNEE, MOIS, CODE_PRODUIT, \`${stkCol}\`, \`${vteCol}\`
            FROM fact_mouvements
            WHERE ANNEE IN (2023, 2024)
        `, [r.nom_region]);
    }

    // Insertion Besoins
    for (const r of regions) {
        console.log(`Besoins [${r.nom_region}]...`);
        const stkCol = r.stk_fields.split(',')[0];
        const vteCol = r.vte_fields.split(',')[0];

        await connection.query(`
            INSERT INTO stock_region_besoin (REGION, ANNEE, MOIS, CODE_BESOIN, STOCK_REGION, VENTE_REGION)
            SELECT ?, ANNEE, MOIS, CODE_BESOIN, SUM(\`${stkCol}\`), SUM(\`${vteCol}\`)
            FROM fact_mouvements
            WHERE ANNEE IN (2023, 2024)
            GROUP BY ANNEE, MOIS, CODE_BESOIN
        `, [r.nom_region]);
    }

    console.log('--- RECONSTRUCTION TERMINÉE ---');
    await connection.end();
}

rebuild().catch(console.error);
