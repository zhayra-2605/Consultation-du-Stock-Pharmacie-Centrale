const mysql = require('mysql2/promise');
const crypto = require('crypto');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pharmacie_centrale',
    multipleStatements: true
};

async function smartVitalizeV2() {
    console.log('--- DÉMARRAGE DE LA VITALISATION AVANCÉE V2 (Variation Aléatoire +/- 15%) ---');
    const pool = mysql.createPool(dbConfig);
    
    try {
        // 1. Récupération des régions et de leurs poids de base
        const [regions] = await pool.query('SELECT * FROM ref_regions ORDER BY id ASC');
        console.log(`Configuration de ${regions.length} régions chargée.`);

        // 2. On traite les données par blocs pour la performance
        // On cible 2023 à 2026
        console.log('Traitement des mouvements (2023-2026)...');

        // Utilisation d'une fonction SQL pour injecter de l'aléatoire pur par ligne
        // RAND() change à chaque appel, contrairement à CRC32 qui est déterministe
        
        for (const reg of regions) {
            console.log(`> Application de la variation pour : ${reg.label}...`);
            
            const stkFields = reg.stk_fields.split(',');
            const vteFields = reg.vte_fields.split(',');
            
            const primaryStk = stkFields[0];
            const primaryVte = vteFields[0];
            
            // On reset les colonnes secondaires et on calcule la principale avec variation
            const stkReset = stkFields.slice(1).map(f => `\`${f}\` = 0`).join(', ');
            const vteReset = vteFields.slice(1).map(f => `\`${f}\` = 0`).join(', ');
            
            const extraStk = stkReset ? `, ${stkReset}` : '';
            const extraVte = vteReset ? `, ${vteReset}` : '';

            // Variation significative : soit (+7% à +15%), soit (-7% à -15%)
            // On exclut la zone neutre (0-6%) pour avoir un impact visuel réel
            const randomFactor = `IF(RAND() > 0.5, 1.07 + (RAND() * 0.08), 0.85 + (RAND() * 0.08))`;

            await pool.query(`
                UPDATE fact_mouvements 
                SET 
                    \`${primaryStk}\` = ROUND(STOCK_TOTAL * ${reg.weight} * ${randomFactor})${extraStk},
                    \`${primaryVte}\` = ROUND(VENTE_TOTAL * ${reg.weight} * ${randomFactor})${extraVte}
                WHERE ANNEE >= 2023
            `);
        }

        console.log('3. Régénération des tables Analytics (Graphiques)...');
        const queries = require('./sql_queries');
        
        // On split les queries car multipleStatements peut être capricieux sur des gros volumes
        const statements = queries.createAnalyticsTables.split(';').map(s => s.trim()).filter(s => s.length > 0);
        for (const sql of statements) {
            await pool.query(sql);
        }

        console.log('--- VITALISATION V2 TERMINÉE AVEC SUCCÈS ---');
        console.log('Les graphiques afficheront désormais des variations naturelles.');

    } catch (err) {
        console.error('ERREUR :', err.message);
    } finally {
        await pool.end();
    }
}

smartVitalizeV2();
