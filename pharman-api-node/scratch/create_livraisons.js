const mysql = require('mysql2/promise');

async function createLivraisonsTable() {
    const conn = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'pharmacie_centrale'
    });

    try {
        console.log('Truncating table...');
        await conn.query('TRUNCATE TABLE fact_livraisons');

        console.log('Fetching ALL products...');
        const [products] = await conn.query('SELECT DISTINCT CODE_PRODUIT FROM dim_produit'); 

        console.log(`Generating mock deliveries for ${products.length} products...`);
        const values = [];

        products.forEach(p => {
            const code = p.CODE_PRODUIT;
            
            // Generate 1-2 past deliveries (échues)
            const numPast = Math.floor(Math.random() * 2) + 1;
            for (let i = 0; i < numPast; i++) {
                const year = 2023 + Math.floor(Math.random() * 2); // 2023 or 2024
                const month = Math.floor(Math.random() * 12) + 1;
                const qty = (Math.floor(Math.random() * 10) + 5) * 100;
                values.push([code, year, month, qty, qty]);
            }

            // Generate 1-2 future deliveries (non échues)
            const numFuture = Math.floor(Math.random() * 2) + 1;
            for (let i = 0; i < numFuture; i++) {
                const year = 2026;
                const month = Math.floor(Math.random() * 6) + 7;
                const qty = (Math.floor(Math.random() * 20) + 10) * 100;
                values.push([code, year, month, qty, qty]);
            }
        });

        console.log('Inserting data...');
        // Batch insert
        while (values.length > 0) {
            const batch = values.splice(0, 1000);
            await conn.query(
                'INSERT INTO fact_livraisons (CODE_PRODUIT, ANNEE, MOIS, QTE_A_LIVRER, QTE_CONVERTI) VALUES ?',
                [batch]
            );
        }

        console.log('Successfully populated fact_livraisons for ALL products.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await conn.end();
    }
}

createLivraisonsTable();
