const mysql = require('mysql2/promise');

async function run() {
    const dbConfig = {
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'pharmacie_centrale'
    };

    try {
        const c = await mysql.createConnection(dbConfig);
        console.log('--- TESTING API QUERIES ---');

        // 1. Produit Detail
        try {
            const [r] = await c.execute('SELECT * FROM dim_produit WHERE CODE_PRODUIT = ? LIMIT 1', ['100745']);
            console.log(' [OK] /produit/100745 -> Rows:', r.length);
        } catch (e) {
            console.log(' [FAIL] /produit/100745 ->', e.message);
        }

        // 2. Stats Besoin
        try {
            const [r] = await c.execute(`
                SELECT ANNEE, SUM(STOCK_REGION) as totalStock 
                FROM stock_region_besoin 
                WHERE CODE_BESOIN = ? AND REGION = 'NATIONAL' 
                GROUP BY ANNEE
            `, ['2-5375']);
            console.log(' [OK] /stats-besoin/2-5375 -> Rows:', r.length);
        } catch (e) {
            console.log(' [FAIL] /stats-besoin/2-5375 ->', e.message);
        }

        // 3. Stock Details (The one causing "National" error likely)
        try {
            const [r] = await c.execute(`
                SELECT 
                    sd.CODE_PRODUIT,
                    dp.LIBELLE AS LIBELLE_PRODUIT,
                    sd.LIBELLE_DEPOT, 
                    sd.LOT AS NUM_LOT,
                    sd.ANNEE_1 AS ANNEE_L,
                    sd.DATEPEREMP, 
                    sd.QUANTITET AS STOCK, 
                    sd.QTE_BLOQUEE,
                    sd.QUARANTAINE, 
                    hm.STOCK_TOTAL, 
                    hm.VENTE_TOTAL
                FROM stock_depot sd
                INNER JOIN dim_produit dp ON sd.CODE_PRODUIT = dp.CODE_PRODUIT
                LEFT JOIN (
                    SELECT CODE_PRODUIT, STOCK_TOTAL, VENTE_TOTAL, ROW_NUMBER() OVER(PARTITION BY CODE_PRODUIT ORDER BY ANNEE DESC, MOIS DESC) as rn
                    FROM fact_mouvements
                ) hm ON sd.CODE_PRODUIT = hm.CODE_PRODUIT AND hm.rn = 1
                WHERE sd.CODE_PRODUIT = ?
            `, ['100745']);
            console.log(' [OK] /stock-details/100745/National -> Rows:', r.length);
        } catch (e) {
            console.log(' [FAIL] /stock-details/100745/National ->', e.message);
        }

        // 4. Stock Summary (Buttons)
        try {
            const [r] = await c.execute(`
                SELECT * FROM fact_mouvements 
                WHERE CODE_PRODUIT = ? 
                ORDER BY ANNEE DESC, MOIS DESC LIMIT 1
            `, ['100745']);
            console.log(' [OK] /stock-summary/100745 -> Rows:', r.length);
        } catch (e) {
            console.log(' [FAIL] /stock-summary/100745 ->', e.message);
        }

        await c.end();
    } catch (err) {
        console.error(' [CRITICAL] Connection failed:', err.message);
    }
}

run();
