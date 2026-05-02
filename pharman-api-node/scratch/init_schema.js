const mysql = require('mysql2/promise');
const fs = require('fs');

(async () => {
    try {
        const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'pharmacie_centrale', multipleStatements: true });
        const sql = fs.readFileSync('../ml_schema.sql', 'utf8');
        await pool.query(sql);
        console.log('✅ ML schema created successfully.');
        process.exit(0);
    } catch (e) {
        console.error('❌ Error creating schema:', e);
        process.exit(1);
    }
})();
