const mysql = require('mysql2/promise');

async function benchmark() {
    const config = {
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'pharmacie_centrale'
    };

    const connection = await mysql.createConnection(config);
    try {
        console.log('--- PERFORMANCE BENCHMARK ---');
        
        // Test 1: Simple product search (LIKE)
        const s1 = Date.now();
        const [search] = await connection.execute(`
            SELECT dp.CODE_PRODUIT, dp.LIBELLE, fm.STOCK_TOTAL 
            FROM dim_produit dp 
            JOIN fact_mouvements fm ON dp.CODE_PRODUIT = fm.CODE_PRODUIT 
            WHERE dp.LIBELLE LIKE '%PARACETAMOL%' AND fm.ANNEE = 2026 AND fm.MOIS = 1
            LIMIT 10
        `);
        console.log(`1. Search '%PARACETAMOL%': ${Date.now() - s1}ms (Results: ${search.length})`);

        // Test 2: Regional stats for a product (using new indexes)
        const s2 = Date.now();
        const [stats] = await connection.execute(`
            SELECT REGION, SUM(STOCK_REGION) as stock 
            FROM stock_region_produit 
            WHERE CODE_PRODUIT = '100001' 
            GROUP BY REGION
        `);
        console.log(`2. Regional Stats (15M row table): ${Date.now() - s2}ms`);

        // Test 3: Advanced Comparison logic (Simulated)
        const s3 = Date.now();
        const [compare] = await connection.execute(`
            SELECT 
                dp.CODE_PRODUIT, 
                latest.STOCK_TOTAL
            FROM dim_produit dp
            INNER JOIN (
                SELECT CODE_PRODUIT, STOCK_TOTAL, ROW_NUMBER() OVER(PARTITION BY CODE_PRODUIT ORDER BY ANNEE DESC, MOIS DESC) as rn
                FROM fact_mouvements
                WHERE ANNEE = 2026
            ) latest ON dp.CODE_PRODUIT = latest.CODE_PRODUIT AND latest.rn = 1
            WHERE dp.CODE_BESOIN = 'A01'
            LIMIT 20
        `);
        console.log(`3. Advanced Comparison logic: ${Date.now() - s3}ms`);

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

benchmark();
