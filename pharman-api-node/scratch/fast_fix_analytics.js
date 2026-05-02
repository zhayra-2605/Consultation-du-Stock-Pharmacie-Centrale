const mysql = require('mysql2/promise');

async function fastFix() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'pharmacie_centrale'
    });

    console.log('--- FAST FIX: ANALYTICS ---');
    
    // 1. National Aggregate for Products (Fast)
    await connection.query('DROP TABLE IF EXISTS stock_region_produit');
    await connection.query(`
        CREATE TABLE stock_region_produit (
            ANNEE INT, MOIS INT, CODE_PRODUIT VARCHAR(255), 
            REGION VARCHAR(50), STOCK_REGION DOUBLE, VENTE_REGION DOUBLE
        )
    `);
    const hubs = ['TUNIS', 'SFAX', 'SOUSSE', 'GAFSA', 'KEF', 'MEDENINE', 'RÉSERVE', 'NATIONAL'];
    
    // 1. Products by Region
    for (const hub of hubs) {
        console.log(`Inserting ${hub} data into stock_region_produit...`);
        if (hub === 'NATIONAL') {
            await connection.query(`
                INSERT INTO stock_region_produit 
                SELECT ANNEE, MOIS, CODE_PRODUIT, 'NATIONAL', STOCK_TOTAL, VENTE_TOTAL 
                FROM fact_mouvements
            `);
            continue;
        }
        const [r] = await connection.query(`SELECT * FROM ref_regions WHERE db_key = ?`, [hub]);
        const reg = r[0];
        const stkExpr = reg.stk_fields.split(',').map(f => `\`${f}\``).join(' + ');
        const vteExpr = reg.vte_fields.split(',').map(f => `\`${f}\``).join(' + ');
        
        await connection.query(`
            INSERT INTO stock_region_produit 
            SELECT ANNEE, MOIS, CODE_PRODUIT, ?, (${stkExpr}), (${vteExpr})
            FROM fact_mouvements
            WHERE (${stkExpr}) > 0 OR (${vteExpr}) > 0
        `, [hub]);
    }

    // 2. Besoins by Region
    for (const hub of hubs) {
        console.log(`Inserting ${hub} data into stock_region_besoin...`);
        if (hub === 'NATIONAL') {
            await connection.query(`
                INSERT INTO stock_region_besoin 
                SELECT ANNEE, MOIS, CODE_BESOIN, 'NATIONAL', SUM(STOCK_TOTAL), SUM(VENTE_TOTAL)
                FROM fact_mouvements 
                GROUP BY ANNEE, MOIS, CODE_BESOIN
            `);
            continue;
        }
        const [r] = await connection.query(`SELECT * FROM ref_regions WHERE db_key = ?`, [hub]);
        const reg = r[0];
        const stkExpr = reg.stk_fields.split(',').map(f => `\`${f}\``).join(' + ');
        const vteExpr = reg.vte_fields.split(',').map(f => `\`${f}\``).join(' + ');

        await connection.query(`
            INSERT INTO stock_region_besoin 
            SELECT ANNEE, MOIS, CODE_BESOIN, ?, SUM(${stkExpr}), SUM(${vteExpr})
            FROM fact_mouvements 
            GROUP BY ANNEE, MOIS, CODE_BESOIN
            HAVING SUM(${stkExpr}) > 0 OR SUM(${vteExpr}) > 0
        `, [hub]);
    }

    // 3. Create Indexes
    await connection.query('CREATE INDEX idx_srp_cp ON stock_region_produit(CODE_PRODUIT)');
    await connection.query('CREATE INDEX idx_srb_cb ON stock_region_besoin(CODE_BESOIN)');

    console.log('--- FAST FIX COMPLETED ---');
    await connection.end();
}

fastFix();
