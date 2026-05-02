const mysql = require('mysql2/promise');

async function run() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'pharmacie_centrale',
        multipleStatements: true,
        connectTimeout: 120000 // 2 minutes
    });

    console.log('--- DÉMARRAGE DE LA RECONSTRUCTION ANALYTIQUE FINALE ---');

    // 1. Clean and Prepare Tables
    console.log('Nettoyage des tables...');
    await connection.query('TRUNCATE TABLE stock_region_produit');
    await connection.query('TRUNCATE TABLE stock_region_besoin');

    const [hubs] = await connection.query('SELECT * FROM ref_regions');
    const allHubs = [...hubs.map(h => h.db_key), 'NATIONAL'];

    // 2. Populate Products by Region
    for (const hub of allHubs) {
        process.stdout.write(`Vérification Produits [${hub}]... `);
        let stkExpr = 'STOCK_TOTAL';
        let vteExpr = 'VENTE_TOTAL';

        if (hub !== 'NATIONAL') {
            const reg = hubs.find(h => h.db_key === hub);
            stkExpr = reg.stk_fields.split(',').map(f => `\`${f}\``).join(' + ');
            vteExpr = reg.vte_fields.split(',').map(f => `\`${f}\``).join(' + ');
        }

        const sql = `
            INSERT INTO stock_region_produit (ANNEE, MOIS, CODE_PRODUIT, REGION, STOCK_REGION, VENTE_REGION)
            SELECT ANNEE, MOIS, CODE_PRODUIT, ?, AVG(${stkExpr}), SUM(${vteExpr})
            FROM fact_mouvements
            WHERE (${stkExpr}) != 0 OR (${vteExpr}) != 0
            GROUP BY ANNEE, MOIS, CODE_PRODUIT
        `;
        await connection.query(sql, [hub]);
        console.log('OK.');
    }

    // 3. Populate Needs by Region
    for (const hub of allHubs) {
        process.stdout.write(`Vérification Besoins [${hub}]... `);
        let stkExpr = 'STOCK_TOTAL';
        let vteExpr = 'VENTE_TOTAL';

        if (hub !== 'NATIONAL') {
            const reg = hubs.find(h => h.db_key === hub);
            stkExpr = reg.stk_fields.split(',').map(f => `\`${f}\``).join(' + ');
            vteExpr = reg.vte_fields.split(',').map(f => `\`${f}\``).join(' + ');
        }

        const sql = `
            INSERT INTO stock_region_besoin (ANNEE, MOIS, CODE_BESOIN, REGION, STOCK_REGION, VENTE_REGION)
            SELECT ANNEE, MOIS, CODE_BESOIN, ?, SUM(${stkExpr}), SUM(${vteExpr})
            FROM fact_mouvements
            GROUP BY ANNEE, MOIS, CODE_BESOIN
            HAVING SUM(${stkExpr}) != 0 OR SUM(${vteExpr}) != 0
        `;
        await connection.query(sql, [hub]);
        console.log('OK.');
    }

    // 4. Indexation (Crucial pour la vitesse)
    console.log('Création des index de performance (Indispensable pour 13M lignes)...');
    try {
        await connection.query('CREATE INDEX idx_srp_composite ON stock_region_produit(CODE_PRODUIT, REGION)');
        await connection.query('CREATE INDEX idx_srb_composite ON stock_region_besoin(CODE_BESOIN, REGION)');
        console.log('Indexation terminée.');
    } catch(e) {
        console.log('Indexation peut-être déjà en cours ou erreur ignoree: ' + e.message);
    }

    console.log('\n--- RECONSTRUCTION TERMINÉE AVEC SUCCÈS ---');
    await connection.end();
}

run().catch(err => {
    console.error('\nERREUR FATALE LORS DE LA RECONSTRUCTION:', err.message);
    process.exit(1);
});
