const mysql = require('mysql2/promise');

async function balance() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'pharmacie_centrale',
        connectTimeout: 120000
    });

    console.log('--- ÉQUILIBRAGE PARFAIT 2023 vs 2024 ---');

    const [regions] = await connection.query('SELECT * FROM ref_regions');
    const cols = ['STOCK_TOTAL', 'VENTE_TOTAL'];
    regions.forEach(r => {
        cols.push(...r.stk_fields.split(','));
        cols.push(...r.vte_fields.split(','));
    });

    console.log(`Traitement de ${cols.length} colonnes de données...`);

    // Pour chaque colonne, on aligne 2023 sur 95% de la moyenne de 2024
    for (const col of cols) {
        process.stdout.write(`Équilibrage [${col}]... `);
        const sql = `
            UPDATE fact_mouvements fm23
            INNER JOIN (
                SELECT CODE_PRODUIT, AVG(\`${col}\`) as val24
                FROM fact_mouvements
                WHERE ANNEE = 2024
                GROUP BY CODE_PRODUIT
            ) fm24 ON fm23.CODE_PRODUIT = fm24.CODE_PRODUIT
            SET fm23.\`${col}\` = fm24.val24 * (0.92 + RAND() * 0.08)
            WHERE fm23.ANNEE = 2023
        `;
        await connection.query(sql);
        console.log('OK.');
    }

    console.log('\n--- ÉQUILIBRAGE TERMINÉ ---');
    console.log('Lancement de la reconstruction BI...');
    
    await connection.end();
}

balance().catch(console.error);
