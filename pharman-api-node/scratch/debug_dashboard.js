const mysql = require('mysql2/promise');

async function debug() {
    const conn = await mysql.createConnection({
        host: 'localhost', user: 'root', password: '',
        database: 'pharmacie_centrale'
    });

    console.log('--- DIAGNOSTIC DES DONNÉES DU DASHBOARD ---');

    // 1. Vérifier les années présentes dans la table finale
    const [years] = await conn.query("SELECT ANNEE, COUNT(*) as nb_lignes, SUM(STOCK_REGION) as total_stock, SUM(VENTE_REGION) as total_vente FROM stock_region_produit WHERE REGION = 'NATIONAL' GROUP BY ANNEE");
    console.log('\nRépartition par année dans le Dashboard :');
    years.forEach(y => {
        console.log(`  Année ${y.ANNEE} : ${y.nb_lignes} lignes | Stock Total: ${Math.round(y.total_stock)} | Ventes Totales: ${Math.round(y.total_vente)}`);
    });

    // 2. Vérifier si les produits sont les mêmes entre 2023 et 2024
    const [missing] = await conn.query("SELECT COUNT(*) as nb FROM fact_mouvements fm24 LEFT JOIN fact_mouvements fm23 ON fm24.CODE_PRODUIT = fm23.CODE_PRODUIT AND fm24.MOIS = fm23.MOIS WHERE fm24.ANNEE = 2024 AND fm23.CODE_PRODUIT IS NULL");
    console.log(`\nProduits en 2024 manquants en 2023 : ${missing[0].nb}`);

    await conn.end();
}

debug().catch(console.error);
