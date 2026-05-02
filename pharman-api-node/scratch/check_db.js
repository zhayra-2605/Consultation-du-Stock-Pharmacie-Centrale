const mysql = require('mysql2/promise');

(async () => {
    const pool = mysql.createPool({
        host: 'localhost', user: 'root', password: '', database: 'pharmacie_centrale'
    });

    // 1. Stats générales du dataset
    const [stats] = await pool.execute(`
        SELECT 
            MIN(ANNEE) as minYear, MAX(ANNEE) as maxYear,
            COUNT(DISTINCT CODE_BESOIN) as nb_besoins,
            COUNT(*) as total_rows
        FROM stock_region_besoin WHERE REGION != 'NATIONAL'
    `);
    console.log('=== DATASET STATS ===');
    console.log(JSON.stringify(stats[0], null, 2));

    // 2. Exemple de données disponibles
    const [sample] = await pool.execute(`
        SELECT srb.CODE_BESOIN, db.LIBELLE, srb.REGION, srb.ANNEE, srb.MOIS, 
               srb.STOCK_REGION, srb.VENTE_REGION
        FROM stock_region_besoin srb 
        JOIN dim_besoin db ON srb.CODE_BESOIN = db.CODE_BESOIN
        WHERE srb.REGION != 'NATIONAL'
        ORDER BY srb.ANNEE DESC, srb.MOIS DESC LIMIT 8
    `);
    console.log('\n=== SAMPLE DATA ===');
    console.log(JSON.stringify(sample, null, 2));

    // 3. Vérifier les valeurs nulles dans VENTE_REGION
    const [nulls] = await pool.execute(`
        SELECT COUNT(*) as lignes_nulle_vente 
        FROM stock_region_besoin 
        WHERE VENTE_REGION IS NULL OR VENTE_REGION = 0
    `);
    console.log('\n=== NULL VENTES ===');
    console.log(JSON.stringify(nulls[0], null, 2));

    // 4. Vérifier les régions
    const [regions] = await pool.execute(`SELECT * FROM ref_regions`);
    console.log('\n=== REF_REGIONS TABLE ===');
    console.log(JSON.stringify(regions, null, 2));

    await pool.end();
})().catch(console.error);
