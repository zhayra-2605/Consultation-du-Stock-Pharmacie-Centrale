const mysql = require('mysql2/promise');

async function fixBesoins() {
    const conn = await mysql.createConnection({
        host: 'localhost', user: 'root', password: '',
        database: 'pharmacie_centrale'
    });

    console.log('1. Réparation des CODE_BESOIN dans fact_mouvements (2024-2026)...');
    await conn.query(`
        UPDATE fact_mouvements fm 
        JOIN dim_produit dp ON fm.CODE_PRODUIT = dp.CODE_PRODUIT 
        SET fm.CODE_BESOIN = dp.CODE_BESOIN 
        WHERE fm.CODE_BESOIN IS NULL OR fm.CODE_BESOIN = ''
    `);

    console.log('2. Vidage de la table stock_region_besoin...');
    await conn.query('TRUNCATE TABLE stock_region_besoin');

    console.log('3. Reconstruction des régions...');
    const [regions] = await conn.query('SELECT * FROM ref_regions');
    for (const r of regions) {
        const stk = r.stk_fields.split(',')[0].trim();
        const vte = r.vte_fields.split(',')[0].trim();
        process.stdout.write(`   ${r.db_key}... `);
        await conn.query(`
            INSERT INTO stock_region_besoin (REGION, ANNEE, MOIS, CODE_BESOIN, STOCK_REGION, VENTE_REGION)
            SELECT ?, ANNEE, MOIS, CODE_BESOIN, SUM(\`${stk}\`), SUM(\`${vte}\`)
            FROM fact_mouvements
            WHERE CODE_BESOIN IS NOT NULL
            GROUP BY ANNEE, MOIS, CODE_BESOIN
        `, [r.db_key]);
        console.log('OK');
    }

    console.log('4. Reconstruction National...');
    await conn.query(`
        INSERT INTO stock_region_besoin (REGION, ANNEE, MOIS, CODE_BESOIN, STOCK_REGION, VENTE_REGION)
        SELECT 'NATIONAL', ANNEE, MOIS, CODE_BESOIN, SUM(STOCK_TOTAL), SUM(VENTE_TOTAL)
        FROM fact_mouvements
        WHERE CODE_BESOIN IS NOT NULL
        GROUP BY ANNEE, MOIS, CODE_BESOIN
    `);
    console.log('OK');

    console.log('\n--- RÉPARATION TERMINÉE ---');
    await conn.end();
}

fixBesoins().catch(console.error);
