import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

async function seed() {
    dotenv.config();

    const connection = await createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true,
    });

    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Remove comments and split by semicolon
    const statements = schemaSql
        .replace(/--.*$/gm, '') // Remove single line comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

    console.log('Running schema.sql statements...');
    for (const statement of statements) {
        if (statement.trim()) {
            try {
                await connection.query(statement);
            } catch (err) {
                console.error('Error executing statement:', statement);
                throw err;
            }
        }
    }
    console.log('Schema executed successfully.');

    await connection.end();
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
