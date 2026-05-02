const mysql = require('mysql2/promise');
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pharmacie_centrale',
});
async function test() {
    try {
        console.log('Querying...');
        const [[years], [months], [rawRegions]] = await Promise.all([
            pool.execute(`SELECT ANNEE, AVG(STOCK_REGION) AS totalStock, SUM(VENTE_REGION) AS totalVente FROM stock_region_besoin WHERE CODE_BESOIN = '2-5243' AND REGION = 'NATIONAL' GROUP BY ANNEE ORDER BY ANNEE ASC`),
            pool.execute(`SELECT MOIS, STOCK_REGION AS totalStock, VENTE_REGION AS totalVente FROM stock_region_besoin WHERE CODE_BESOIN = '2-5243' AND REGION = 'NATIONAL' AND ANNEE = (SELECT MAX(ANNEE) FROM stock_region_besoin WHERE CODE_BESOIN = '2-5243' AND REGION = 'NATIONAL') ORDER BY MOIS ASC`),
            pool.execute(`WITH Latest AS ( SELECT *, ROW_NUMBER() OVER(PARTITION BY REGION ORDER BY ANNEE DESC, MOIS DESC) AS rn FROM stock_region_besoin WHERE CODE_BESOIN = '2-5243' AND REGION != 'NATIONAL' ) SELECT REGION, STOCK_REGION AS totalStock, VENTE_REGION AS totalVente FROM Latest WHERE rn = 1`)
        ]);
        console.log('Years:', years);
        console.log('Months:', months);
        console.log('Regions:', rawRegions);
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
test();
