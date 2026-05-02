const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pharmacie_centrale',
    waitForConnections: true,
    connectionLimit: 10
};

async function runEnrichment() {
    console.log('--- DÉMARRAGE DE L\'ENRICHISSEMENT AVANCÉ (2024-2026) ---');
    const pool = mysql.createPool(dbConfig);
    
    try {
        const [products] = await pool.query('SELECT CODE_PRODUIT, LIBELLE FROM dim_produit');
        const [regions]  = await pool.query('SELECT * FROM ref_regions');
        
        console.log(`Traitement de ${products.length} produits...`);

        const timeSteps = [];
        // 2024
        for (let m = 1; m <= 12; m++) timeSteps.push({ y: 2024, m });
        // 2025
        for (let m = 1; m <= 12; m++) timeSteps.push({ y: 2025, m });
        // 2026
        timeSteps.push({ y: 2026, m: 1 }, { y: 2026, m: 2 });

        const batchSize = 10000;
        let insertionBuffer = [];

        // Pre-calculate column indices for faster insertion
        const allColumns = ['ANNEE', 'MOIS', 'DATEMVT', 'CODE_PRODUIT', 'STOCK_TOTAL', 'VENTE_TOTAL'];
        regions.forEach(r => {
            allColumns.push(...r.stk_fields.split(','));
            allColumns.push(...r.vte_fields.split(','));
        });
        const placeholders = `(${allColumns.map(() => '?').join(',')})`;

        for (let i = 0; i < products.length; i++) {
            const prod = products[i];
            
            // Assign Profile
            const randProfile = Math.random();
            let baseCMM = 0;
            if (randProfile < 0.7) baseCMM = 50 + Math.random() * 450;    // Moyen (70%)
            else if (randProfile < 0.9) baseCMM = 10 + Math.random() * 40; // Faible (20%)
            else baseCMM = 500 + Math.random() * 4500;                    // Forte (10%)

            // Scenario ML
            const scenario = Math.random(); // 0-0.1: Rupture, 0.1-0.2: Surstock, rest: Normal
            
            let currentStock = baseCMM * (3 + Math.random() * 3); // Initial stock Jan 2024

            for (const step of timeSteps) {
                // 1. Annual Growth
                let growth = 1.0;
                if (step.y === 2024) growth = 1.0 + (0.05 + Math.random() * 0.07);
                if (step.y === 2025) growth = 1.15 + (0.05 + Math.random() * 0.10);
                if (step.y === 2026) growth = 1.25 + (0.02 + Math.random() * 0.03);

                // 2. Seasonality
                let seasonality = 1.0;
                if (step.m <= 2 || step.m >= 11) seasonality = 1.20; // Hiver +20%
                
                // 3. Target Sales
                const sales = Math.max(1, Math.round(baseCMM * growth * seasonality * (0.9 + Math.random() * 0.2)));
                
                // 4. Target Coverage (Standard: 3 to 6 months)
                let targetCoverage = 3 + Math.random() * 3;
                if (scenario < 0.1) targetCoverage = Math.max(0.2, targetCoverage - (step.y - 2024) * 0.5 - (step.m / 6)); // Gradual Stockout
                if (scenario >= 0.1 && scenario < 0.2) targetCoverage = targetCoverage + (step.y - 2024) * 2 + (step.m / 2); // Accumulation

                const targetStock = sales * targetCoverage;

                // 5. Calculate Supply to reach targetStock
                // NewStock = PrevStock + Supply - Sales => Supply = NewStock - PrevStock + Sales
                let supply = Math.max(0, Math.round(targetStock - currentStock + sales));
                
                // Apply noise to supply
                supply = Math.round(supply * (0.95 + Math.random() * 0.1));
                
                currentStock = currentStock + supply - sales;
                if (currentStock < 0) currentStock = 0;

                // 6. Regional Dispatch
                const rowData = {
                    ANNEE: step.y,
                    MOIS: step.m,
                    DATEMVT: '2026-04-28', // Placeholder
                    CODE_PRODUIT: prod.CODE_PRODUIT,
                    STOCK_TOTAL: Math.round(currentStock),
                    VENTE_TOTAL: sales
                };

                regions.forEach(reg => {
                    const regWeight = reg.weight;
                    const regStock = currentStock * regWeight * (0.9 + Math.random() * 0.2);
                    const regVente = sales * regWeight * (0.9 + Math.random() * 0.2);

                    const stkCols = reg.stk_fields.split(',');
                    const vteCols = reg.vte_fields.split(',');

                    // Split within region (Hospitals vs Officines)
                    // If multiple columns, we assume some are HOP, some are OFF
                    stkCols.forEach((col, idx) => {
                        let factor = 1.0;
                        if (col.includes('HOP') || col.includes('TUDIPH') || col.includes('FERME')) factor = 1.5; // High priority/volume
                        const share = (factor / (stkCols.length * 1.25)) * (0.9 + Math.random() * 0.2);
                        rowData[col] = Math.round(regStock * share);
                    });
                    vteCols.forEach((col, idx) => {
                        let factor = 1.0;
                        if (col.includes('HOP') || col.includes('TUDIPH') || col.includes('FERME')) factor = 1.5;
                        const share = (factor / (vteCols.length * 1.25)) * (0.9 + Math.random() * 0.2);
                        rowData[col] = Math.round(regVente * share);
                    });
                    
                    // Specific for RESERVE: Massive Stock
                    if (reg.db_key === 'RÉSERVE') {
                        stkCols.forEach(col => rowData[col] = Math.round(rowData[col] * 3)); // Over-weight reserve stock
                    }
                });

                // Prepare flat array for insertion
                const flatRow = allColumns.map(c => rowData[c]);
                insertionBuffer.push(flatRow);

                if (insertionBuffer.length >= batchSize) {
                    const sql = `INSERT IGNORE INTO fact_mouvements (${allColumns.map(c => '`'+c+'`').join(',')}) VALUES ?`;
                    await pool.query(sql, [insertionBuffer]);
                    insertionBuffer = [];
                }
            }

            if (i % 1000 === 0 && i > 0) console.log(`Progression : ${i}/${products.length} produits...`);
        }

        if (insertionBuffer.length > 0) {
            const sql = `INSERT IGNORE INTO fact_mouvements (${allColumns.map(c => '`'+c+'`').join(',')}) VALUES ?`;
            await pool.query(sql, [insertionBuffer]);
        }

        console.log('--- GÉNÉRATION TERMINÉE ---');
        console.log('Mise à jour des tables Analytics...');
        const queries = require('../scripts/etl/sql_queries');
        await pool.query(queries.createAnalyticsTables);
        console.log('--- TOUT EST PRÊT ---');

    } catch (err) {
        console.error('Erreur FATALE:', err.message);
    } finally {
        await pool.end();
    }
}

runEnrichment();
