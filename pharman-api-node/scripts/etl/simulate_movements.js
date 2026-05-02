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
    console.log('--- Démarrage de la Simulation de Données Statistiques GLOBALE (2024-2026) ---');
    const pool = mysql.createPool(dbConfig);
    
    try {
        console.log('Identification des produits nécessitant des données pour 2026...');
        const [products] = await pool.query(`
            SELECT CODE_PRODUIT 
            FROM dim_produit
            WHERE CODE_PRODUIT NOT IN (
                SELECT DISTINCT CODE_PRODUIT FROM fact_mouvements WHERE ANNEE = 2026
            )
        `);
        
        console.log(`${products.length} produits vont être simulés.`);
        
        if (products.length === 0) {
            console.log('Tous les produits ont déjà des données pour 2026.');
        } else {
            // Months for late 2023, all 2024, all 2025, and early 2026
            const months = [];
            for (let y = 2024; y <= 2025; y++) {
                for (let m = 1; m <= 12; m++) months.push({ a: y, m });
            }
            months.push({ a: 2026, m: 1 }, { a: 2026, m: 2 }, { a: 2026, m: 3 }, { a: 2026, m: 4 });

            const batchSize = 1000;
            let values = [];

            for (let i = 0; i < products.length; i++) {
                const code = products[i].CODE_PRODUIT;
                // Valeurs réalistes pour une pharmacie centrale tunisienne :
                // CMM nationale = 1 à 5 unités/mois (médicaments spéciaux)
                const cmm = Math.floor(Math.random() * 5) + 1;         // CMM entre 1 et 5
                const couvertureMois = Math.floor(Math.random() * 18) + 6; // couverture 6 à 24 mois
                const baseStock = cmm * couvertureMois;                 // stock cohérent avec CMM

                for (const month of months) {
                    // Petite variation mensuelle autour du stock de base (±15%)
                    const finalStock = Math.max(cmm, Math.round(baseStock * (0.85 + Math.random() * 0.30)));
                    // Ventes = CMM ± 20%
                    const sales = Math.max(0, Math.round(cmm * (0.80 + Math.random() * 0.40)));
                    
                    values.push([month.a, month.m, 45169, code, finalStock, sales]);

                    if (values.length >= batchSize) {
                        await pool.query(
                            'INSERT IGNORE INTO fact_mouvements (ANNEE, MOIS, DATEMVT, CODE_PRODUIT, STOCK_TOTAL, VENTE_TOTAL) VALUES ?',
                            [values]
                        );
                        values = [];
                    }
                }
                if (i % 5000 === 0 && i > 0) console.log(`Progression : ${i}/${products.length} produits traités...`);
            }

            if (values.length > 0) {
                await pool.query(
                    'INSERT IGNORE INTO fact_mouvements (ANNEE, MOIS, DATEMVT, CODE_PRODUIT, STOCK_TOTAL, VENTE_TOTAL) VALUES ?',
                    [values]
                );
            }
        }

        console.log('--- Simulation GLOBALE terminée avec succès ---');

    } catch (err) {
        console.error('Erreur pendant la simulation :', err.message);
    } finally {
        await pool.end();
    }
}

simulate();
