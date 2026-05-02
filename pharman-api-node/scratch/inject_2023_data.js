const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pharmacie_centrale',
    waitForConnections: true,
    connectionLimit: 10
};

async function runInjection() {
    console.log('--- DÉMARRAGE DE L\'INJECTION DES DONNÉES HISTORIQUES 2023 ---');
    const pool = mysql.createPool(dbConfig);
    
    try {
        const [products] = await pool.query('SELECT CODE_PRODUIT, CODE_BESOIN FROM dim_produit');
        const [regions]  = await pool.query('SELECT * FROM ref_regions');
        
        console.log(`Préparation pour ${products.length} produits sur 12 mois en 2023...`);

        // Nettoyage préalable de 2023 pour repartir sur du propre
        console.log('Nettoyage des données 2023 existantes...');
        await pool.query('DELETE FROM fact_mouvements WHERE ANNEE = 2023');

        const allColumns = ['ANNEE', 'MOIS', 'DATEMVT', 'CODE_PRODUIT', 'CODE_BESOIN', 'STOCK_TOTAL', 'VENTE_TOTAL'];
        regions.forEach(r => {
            allColumns.push(...r.stk_fields.split(','));
            allColumns.push(...r.vte_fields.split(','));
        });

        const batchSize = 5000;
        let insertionBuffer = [];

        for (let i = 0; i < products.length; i++) {
            const prod = products[i];
            
            // Profile aléatoire aligné sur enrich_data_advanced.js
            const randProfile = Math.random();
            let baseCMM = 0;
            if (randProfile < 0.7) baseCMM = 60 + Math.random() * 500;    // Moyen (70%)
            else if (randProfile < 0.9) baseCMM = 15 + Math.random() * 50; // Faible (20%)
            else baseCMM = 600 + Math.random() * 5000;                    // Forte (10%)

            for (let m = 1; m <= 12; m++) {
                // Saisonnalité légère
                let seasonality = 1.0;
                if (m <= 2 || m >= 11) seasonality = 1.2; 
                
                // On vise un volume proche de 2024 (qui est à ~1.05 * baseCMM)
                const sales = Math.max(1, Math.round(baseCMM * seasonality * (0.95 + Math.random() * 0.2)));
                const coverage = 3 + Math.random() * 3; // 3 à 6 mois de couverture (plus réaliste)
                const stock = Math.round(sales * coverage);

                const rowData = {
                    ANNEE: 2023,
                    MOIS: m,
                    DATEMVT: `2023-${String(m).padStart(2, '0')}-01`,
                    CODE_PRODUIT: prod.CODE_PRODUIT,
                    CODE_BESOIN: prod.CODE_BESOIN,
                    STOCK_TOTAL: stock,
                    VENTE_TOTAL: sales
                };

                // Dispatch régional
                regions.forEach(reg => {
                    const regWeight = reg.weight;
                    const regStock = stock * regWeight * (0.95 + Math.random() * 0.1);
                    const regVente = sales * regWeight * (0.95 + Math.random() * 0.1);

                    const stkCols = reg.stk_fields.split(',');
                    const vteCols = reg.vte_fields.split(',');

                    stkCols.forEach(col => {
                        rowData[col] = Math.round(regStock / stkCols.length);
                    });
                    vteCols.forEach(col => {
                        rowData[col] = Math.round(regVente / vteCols.length);
                    });
                });

                const flatRow = allColumns.map(c => rowData[c]);
                insertionBuffer.push(flatRow);

                if (insertionBuffer.length >= batchSize) {
                    const sql = `INSERT INTO fact_mouvements (${allColumns.map(c => '`'+c+'`').join(',')}) VALUES ?`;
                    await pool.query(sql, [insertionBuffer]);
                    insertionBuffer = [];
                }
            }

            if (i % 2000 === 0 && i > 0) console.log(`Progression : ${i}/${products.length} produits injectés...`);
        }

        if (insertionBuffer.length > 0) {
            const sql = `INSERT INTO fact_mouvements (${allColumns.map(c => '`'+c+'`').join(',')}) VALUES ?`;
            await pool.query(sql, [insertionBuffer]);
        }

        console.log('--- INJECTION 2023 TERMINÉE ---');
        
    } catch (err) {
        console.error('Erreur lors de l\'injection:', err.message);
    } finally {
        await pool.end();
    }
}

runInjection();
