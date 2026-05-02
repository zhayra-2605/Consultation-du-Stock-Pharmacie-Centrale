const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pharmacie_centrale',
    multipleStatements: true
};

async function distributeRegions() {
    console.log('--- Démarrage de la Distribution Régionale Aléatoire ---');
    const pool = mysql.createPool(dbConfig);
    
    try {
        // On récupère les lignes qui ont un STOCK_TOTAL mais pas de données régionales
        const [rows] = await pool.query(`
            SELECT ANNEE, MOIS, CODE_PRODUIT, STOCK_TOTAL, VENTE_TOTAL 
            FROM fact_mouvements 
            WHERE DATEMVT = 45169
        `);

        console.log(`Distribution de ${rows.length} enregistrements...`);

        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            
            // On distribue le stock entre plusieurs régions
            // 30% Tunis, 20% Sfax, 15% Sousse, 10% Gafsa, 5% Kef, 10% Medenine, 10% Reserve
            const stkTunis = Math.floor(r.STOCK_TOTAL * 0.30);
            const stkSfax  = Math.floor(r.STOCK_TOTAL * 0.20);
            const stkSousse = Math.floor(r.STOCK_TOTAL * 0.15);
            const stkGafsa = Math.floor(r.STOCK_TOTAL * 0.10);
            const stkKef   = Math.floor(r.STOCK_TOTAL * 0.05);
            const stkMed   = Math.floor(r.STOCK_TOTAL * 0.10);
            const stkRes   = r.STOCK_TOTAL - stkTunis - stkSfax - stkSousse - stkGafsa - stkKef - stkMed;

            await pool.query(`
                UPDATE fact_mouvements 
                SET 
                    STKTUDIPH = ?, STKCEPHOP = ?, STKSODHOP = ?, 
                    STKGAFSA = ?, STKKEF = ?, STKMEDENINE = ?, STKRESHOP = ?
                WHERE ANNEE = ? AND MOIS = ? AND CODE_PRODUIT = ?
            `, [
                Math.max(0, stkTunis), Math.max(0, stkSfax), Math.max(0, stkSousse), 
                Math.max(0, stkGafsa), Math.max(0, stkKef), Math.max(0, stkMed), Math.max(0, stkRes),
                r.ANNEE, r.MOIS, r.CODE_PRODUIT
            ]);

            if (i % 2000 === 0) console.log(`Progression : ${i}/${rows.length}...`);
        }

        console.log('--- Distribution terminée. Mise à jour de stock_region_besoin ---');
        
        await pool.query(`DROP TABLE IF EXISTS stock_region_besoin`);
        await pool.query(`
            CREATE TABLE stock_region_besoin AS
            -- TUNIS
            SELECT 
                CODE_BESOIN, ANNEE, MOIS, 'TUNIS' as REGION, 
                SUM(COALESCE(STKTUDIPH,0)+COALESCE(STKDIST,0)+COALESCE(STKCOMPT,0)+COALESCE(STKFERME,0)+COALESCE(STKSERUM,0)+COALESCE(STKVACCIN,0)) as STOCK_REGION,
                SUM(COALESCE(VTETUDIPH,0)+COALESCE(VTEDIST,0)+COALESCE(VTECOMPT,0)+COALESCE(VTEFERME,0)+COALESCE(VTESERUM,0)+COALESCE(VTEVACCIN,0)) as VENTE_REGION
            FROM fact_mouvements GROUP BY ANNEE, MOIS, CODE_BESOIN
            UNION ALL
            -- SFAX
            SELECT ANNEE, MOIS, CODE_BESOIN, 'SFAX' as REGION, SUM(COALESCE(STKCEPHOP,0)+COALESCE(STKCEPOF,0)), SUM(COALESCE(VTECEPHOP,0)+COALESCE(VTECEPOF,0))
            FROM fact_mouvements GROUP BY ANNEE, MOIS, CODE_BESOIN
            UNION ALL
            -- SOUSSE
            SELECT ANNEE, MOIS, CODE_BESOIN, 'SOUSSE' as REGION, SUM(COALESCE(STKSODHOP,0)+COALESCE(STKSODOF,0)), SUM(COALESCE(VTESODHOP,0)+COALESCE(VTESODHOP,0))
            FROM fact_mouvements GROUP BY ANNEE, MOIS, CODE_BESOIN
            UNION ALL
            -- GAFSA
            SELECT ANNEE, MOIS, CODE_BESOIN, 'GAFSA' as REGION, SUM(COALESCE(STKGAFSA,0)), SUM(COALESCE(VTEGAFSA,0))
            FROM fact_mouvements GROUP BY ANNEE, MOIS, CODE_BESOIN
            UNION ALL
            -- KEF
            SELECT ANNEE, MOIS, CODE_BESOIN, 'KEF' as REGION, SUM(COALESCE(STKKEF,0)), SUM(COALESCE(VTEKEF,0))
            FROM fact_mouvements GROUP BY ANNEE, MOIS, CODE_BESOIN
            UNION ALL
            -- MEDENINE
            SELECT ANNEE, MOIS, CODE_BESOIN, 'MEDENINE' as REGION, SUM(COALESCE(STKMEDENINE,0)), SUM(COALESCE(VTEMEDENINE,0))
            FROM fact_mouvements GROUP BY ANNEE, MOIS, CODE_BESOIN
            UNION ALL
            -- RESERVE
            SELECT ANNEE, MOIS, CODE_BESOIN, 'RÉSERVE' as REGION, SUM(COALESCE(STKRESHOP,0)+COALESCE(STKRESOF,0)), SUM(COALESCE(VTERESHOP,0)+COALESCE(VTERESOF,0))
            FROM fact_mouvements GROUP BY ANNEE, MOIS, CODE_BESOIN
            UNION ALL
            -- NATIONAL
            SELECT ANNEE, MOIS, CODE_BESOIN, 'NATIONAL' as REGION, SUM(STOCK_TOTAL), SUM(VENTE_TOTAL)
            FROM fact_mouvements GROUP BY ANNEE, MOIS, CODE_BESOIN;
        `);


        console.log('--- Base de données Statistiques enrichie avec succès ---');

    } catch (err) {
        console.error('Erreur :', err.message);
    } finally {
        await pool.end();
    }
}

distributeRegions();
