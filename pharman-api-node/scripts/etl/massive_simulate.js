const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pharmacie_centrale',
    waitForConnections: true,
    connectionLimit: 10
};

async function simulate() {
    console.log('--- Démarrage de la Simulation de Données Statistiques MASSIVE (2024-2026) ---');
    const pool = mysql.createPool(dbConfig);
    
    try {
        console.log('Récupération de la liste complète des produits...');
        const [products] = await pool.query('SELECT CODE_PRODUIT, CODE_BESOIN FROM dim_produit');
        console.log(`${products.length} produits identifiés.`);

        // Années et mois à simuler
        const years = [2024, 2025, 2026];
        const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

        const batchSize = 2000;
        let values = [];

        for (let i = 0; i < products.length; i++) {
            const { CODE_PRODUIT: code, CODE_BESOIN: besoin } = products[i];
            
            // Valeurs réalistes basées sur la moyenne nationale (~13k)
            const baseStock = 5000 + Math.floor(Math.random() * 15000); 
            const avgSales = Math.floor(baseStock / 10); // CMM réaliste

            for (const year of years) {
                for (const month of months) {
                    // Variation mensuelle organique (+/- 15%)
                    const currentStock = Math.round(baseStock * (0.85 + Math.random() * 0.30));
                    const currentSales = Math.round(avgSales * (0.80 + Math.random() * 0.40));
                    
                    // Date fictive (TIMESTAMP)
                    const datemvt = 1704067200 + ( (year-2024)*31536000 ) + (month*2592000);

                    values.push([year, month, datemvt, code, currentStock, currentSales, besoin]);

                    if (values.length >= batchSize) {
                        await pool.query(
                            'INSERT IGNORE INTO fact_mouvements (ANNEE, MOIS, DATEMVT, CODE_PRODUIT, STOCK_TOTAL, VENTE_TOTAL, CODE_BESOIN) VALUES ?',
                            [values]
                        );
                        values = [];
                    }
                }
            }
            if (i % 5000 === 0 && i > 0) console.log(`Progression : ${i}/${products.length} produits simulés...`);
        }

        if (values.length > 0) {
            await pool.query(
                'INSERT IGNORE INTO fact_mouvements (ANNEE, MOIS, DATEMVT, CODE_PRODUIT, STOCK_TOTAL, VENTE_TOTAL, CODE_BESOIN) VALUES ?',
                [values]
            );
        }

        console.log('--- Simulation MASSIVE terminée. Lancement de la vitalisation régionale... ---');
        
    } catch (err) {
        console.error('Erreur pendant la simulation :', err.message);
    } finally {
        await pool.end();
    }
}

simulate();
