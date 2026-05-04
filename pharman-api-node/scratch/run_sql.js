const fs = require('fs');
const path = require('path');
const { pool } = require('../utils/db');

async function runSQL() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'setup_auth_db.sql'), 'utf8');
        await pool.query(sql);
        console.log('Database updated successfully');
        process.exit(0);
    } catch (err) {
        console.error('Error updating db', err);
        process.exit(1);
    }
}
runSQL();
