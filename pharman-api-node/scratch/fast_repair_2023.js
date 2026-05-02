const mysql = require('mysql2/promise');

async function repair() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'pharmacie_centrale',
        multipleStatements: true,
        connectTimeout: 120000
    });

    console.log('--- RÉPARATION RAPIDE BESOINS 2023 ---');

    // 1. Update CODE_BESOIN in fact_mouvements just in case (redundant but safe)
    console.log('Synchronisation CODE_BESOIN dans fact_mouvements (2023)...');
    await connection.query(`
        UPDATE fact_mouvements fm 
        INNER JOIN dim_produit dp ON fm.CODE_PRODUIT = dp.CODE_PRODUIT 
        SET fm.CODE_BESOIN = dp.CODE_BESOIN 
        WHERE fm.ANNEE = 2023 AND (fm.CODE_BESOIN IS NULL OR fm.CODE_BESOIN = '')
    `);

    // 2. Clear 2023 in BI tables
    console.log('Nettoyage des tables BI pour 2023...');
    await connection.query('DELETE FROM stock_region_produit WHERE ANNEE = 2023');
    await connection.query('DELETE FROM stock_region_besoin WHERE ANNEE = 2023');

    const [hubs] = await connection.query('SELECT * FROM ref_regions');
    const allHubs = [...hubs.map(h => h.db_key), 'NATIONAL'];

    // 3. Repopulate Products for 2023
    for (const hub of allHubs) {
        process.stdout.write(`Produits 2023 [${hub}]... `);
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
            WHERE ANNEE = 2023 AND ((${stkExpr}) != 0 OR (${vteExpr}) != 0)
            GROUP BY ANNEE, MOIS, CODE_PRODUIT
        `;
        await connection.query(sql, [hub]);
        console.log('OK.');
    }

    // 4. Repopulate Needs for 2023
    for (const hub of allHubs) {
        process.stdout.write(`Besoins 2023 [${hub}]... `);
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
            WHERE ANNEE = 2023
            GROUP BY ANNEE, MOIS, CODE_BESOIN
            HAVING SUM(${stkExpr}) != 0 OR SUM(${vteExpr}) != 0
        `;
        await connection.query(sql, [hub]);
        console.log('OK.');
    }

    console.log('\n--- RÉPARATION 2023 TERMINÉE ---');
    await connection.end();
}

repair().catch(console.error);
