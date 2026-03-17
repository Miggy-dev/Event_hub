import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const passwords = [
    process.env.DATABASE_URL?.split(':')[2]?.split('@')[0], // The one in .env
    'postgres',
    'admin',
    'root',
    '', // No password
];

async function testConnection() {
    console.log('--- Database Authentication Tester ---');
    
    for (const pwd of [...new Set(passwords)]) {
        console.log(`Testing with password: "${pwd === '' ? '(empty)' : pwd}"...`);
        const client = new Client({
            user: 'postgres',
            host: 'localhost',
            database: 'postgres', // Test with default db first
            password: pwd,
            port: 5432,
            ssl: false
        });

        try {
            await client.connect();
            console.log(`✅ SUCCESS! The correct password is: "${pwd}"`);
            await client.end();
            process.exit(0);
        } catch (err) {
            console.log(`❌ Failed: ${err.message}`);
        }
    }
    
    console.log('\n--- Troubleshooting ---');
    console.log('1. Open "pgAdmin 4" and check your credentials.');
    console.log('2. Try running "psql -U postgres" in your terminal.');
    console.log('3. If you forgot your password, search for "Reset PostgreSQL password on Windows".');
}

testConnection();
