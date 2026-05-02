const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pharmacie_centrale',
    multipleStatements: true
};

async function syncStockDetails() {
    console.log('--- Démarrage de la Synchronisation des Détails de Stock (Lots) ---');
    const pool = mysql.createPool(dbConfig);
    
    try {
        console.log('Récupération des statistiques vitalisées...');
        // On récupère les colonnes de stock pour toutes les régions
        const [rows] = await pool.query(`
            SELECT 
                CODE_PRODUIT, 
                STKTUDIPH, STKCEPHOP, STKSODHOP, STKGAFSA, STKKEF, STKMEDENINE, STKRESHOP
            FROM fact_mouvements 
            WHERE ANNEE = 2026 AND MOIS = 4
        `);

        console.log(`Traitement de ${rows.length} produits...`);
        
        await pool.query(`DELETE FROM stock_depot`);

        const batchSize = 1000;
        let values = [];

        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            
            // Mapping des colonnes vers les noms de dépôts réels pour stock_depot
            const regions = [
                { name: 'TUDIPHARMA', stock: r.STKTUDIPH },
                { name: 'CEPHARMA HOPITAUX SFAX', stock: r.STKCEPHOP },
                { name: 'SODIPHAC HOPITAUX SOUSSE', stock: r.STKSODHOP },
                { name: 'DEPOT GAFSA', stock: r.STKGAFSA },
                { name: 'DEPOT LE KEF', stock: r.STKKEF },
                { name: 'DEPOT MEDENINE', stock: r.STKMEDENINE },
                { name: 'RESERVE HOPITAUX', stock: r.STKRESHOP }
            ];

            for (const reg of regions) {
                if (reg.stock > 0) {
                    // Création de 1 ou 2 lots par dépôt pour simuler la réalité
                    const numLots = Math.random() > 0.5 ? 2 : 1;
                    const stockPerLot = Math.floor(reg.stock / numLots);
                    
                    for (let l = 0; l < numLots; l++) {
                        const lotQty = (l === numLots - 1) ? (reg.stock - (stockPerLot * l)) : stockPerLot;
                        if (lotQty <= 0) continue;

                        const lotNum = `LOT-${Math.floor(Math.random() * 9000) + 1000}`;
                        const year = Math.floor(Math.random() * 3) + 2025; // Expire en 2025-2027
                        const month = Math.floor(Math.random() * 12) + 1;
                        const datePeremp = `${year}-${month.toString().padStart(2, '0')}-01`;

                        values.push([
                            r.CODE_PRODUIT,
                            reg.name,
                            lotNum,
                            2024, // ANNEE_L (Lot Year)
                            datePeremp,
                            lotQty,
                            0, // QTE_BLOQUEE
                            0  // QUARANTAINE
                        ]);
                    }
                }
            }


            if (values.length >= batchSize) {
                await pool.query(`
                    INSERT INTO stock_depot (CODE_PRODUIT, LIBELLE_DEPOT, LOT, ANNEE_1, DATEPEREMP, QUANTITET, QTE_BLOQUEE, QUARANTAINE)
                    VALUES ?
                `, [values]);
                values = [];
            }

            if (i % 5000 === 0) console.log(`Progression : ${i}/${rows.length} produits synchronisés...`);
        }

        if (values.length > 0) {
            await pool.query(`
                INSERT INTO stock_depot (CODE_PRODUIT, LIBELLE_DEPOT, LOT, ANNEE_1, DATEPEREMP, QUANTITET, QTE_BLOQUEE, QUARANTAINE)
                VALUES ?
            `, [values]);
        }

        console.log('--- Synchronisation terminée avec succès ---');

    } catch (err) {
        console.error('Erreur :', err.message);
    } finally {
        await pool.end();
    }
}

syncStockDetails();
