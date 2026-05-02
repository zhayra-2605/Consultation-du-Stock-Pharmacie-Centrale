const mysql = require('mysql2/promise');
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pharmacie_centrale',
});
async function fix() {
    try {
        console.log('Dropping stock_region_produit if exists...');
        await pool.execute('DROP TABLE IF EXISTS stock_region_produit');
        console.log('Creating stock_region_produit...');
        const sql = `
            CREATE TABLE stock_region_produit AS
            SELECT ANNEE, MOIS, CODE_PRODUIT, 'TUNIS' as REGION, 
            SUM(COALESCE(STKTUDIPH,0)+COALESCE(STKCHIMIE,0)+COALESCE(STKDIST,0)+COALESCE(STKCOMPT,0)+COALESCE(STKFERME,0)+COALESCE(STKSERUM,0)+COALESCE(STKVACCIN,0)+COALESCE(STKHOMEO,0)+COALESCE(STKVET,0)+COALESCE(STKDENT,0)) as STOCK_REGION,
            SUM(COALESCE(VTETUDIPH,0)+COALESCE(VTECHIMIE,0)+COALESCE(VTEDIST,0)+COALESCE(VTECOMPT,0)+COALESCE(VTEFERME,0)+COALESCE(VTESERUM,0)+COALESCE(VTEVACCIN,0)+COALESCE(VTEHOMEO,0)+COALESCE(VTEVET,0)+COALESCE(VTEDENT,0)) as VENTE_REGION
            FROM fact_mouvements GROUP BY ANNEE, MOIS, CODE_PRODUIT
            UNION ALL
            SELECT ANNEE, MOIS, CODE_PRODUIT, 'SFAX' as REGION, SUM(COALESCE(STKCEPHOP,0)+COALESCE(STKCEPOF,0)), SUM(COALESCE(VTECEPHOP,0)+COALESCE(VTECEPOF,0))
            FROM fact_mouvements GROUP BY ANNEE, MOIS, CODE_PRODUIT
            UNION ALL
            SELECT ANNEE, MOIS, CODE_PRODUIT, 'SOUSSE' as REGION, SUM(COALESCE(STKSODHOP,0)+COALESCE(STKSODOF,0)), SUM(COALESCE(VTESODHOP,0)+COALESCE(VTESODOF,0))
            FROM fact_mouvements GROUP BY ANNEE, MOIS, CODE_PRODUIT
            UNION ALL
            SELECT ANNEE, MOIS, CODE_PRODUIT, 'GAFSA' as REGION, SUM(COALESCE(STKGAFSA,0)), SUM(COALESCE(VTEGAFSA,0))
            FROM fact_mouvements GROUP BY ANNEE, MOIS, CODE_PRODUIT
            UNION ALL
            SELECT ANNEE, MOIS, CODE_PRODUIT, 'KEF' as REGION, SUM(COALESCE(STKKEF,0)), SUM(COALESCE(VTEKEF,0))
            FROM fact_mouvements GROUP BY ANNEE, MOIS, CODE_PRODUIT
            UNION ALL
            SELECT ANNEE, MOIS, CODE_PRODUIT, 'MEDENINE' as REGION, SUM(COALESCE(STKMEDENINE,0)), SUM(COALESCE(VTEMEDENINE,0))
            FROM fact_mouvements GROUP BY ANNEE, MOIS, CODE_PRODUIT
            UNION ALL
            SELECT ANNEE, MOIS, CODE_PRODUIT, 'RÉSERVE' as REGION, SUM(COALESCE(STKRESHOP,0)+COALESCE(STKRESOF,0)), SUM(COALESCE(VTERESHOP,0)+COALESCE(VTERESOF,0))
            FROM fact_mouvements GROUP BY ANNEE, MOIS, CODE_PRODUIT
            UNION ALL
            SELECT ANNEE, MOIS, CODE_PRODUIT, 'NATIONAL' as REGION, SUM(STOCK_TOTAL), SUM(VENTE_TOTAL)
            FROM fact_mouvements GROUP BY ANNEE, MOIS, CODE_PRODUIT
        `;
        await pool.execute(sql);
        console.log('Adding index to stock_region_produit...');
        await pool.execute('ALTER TABLE stock_region_produit ADD INDEX idx_produit (CODE_PRODUIT(50))');
        console.log('Done!');
        process.exit(0);
    } catch(err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}
fix();
