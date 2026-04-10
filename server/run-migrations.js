import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrations = [
    'migrate-check-ins.js',
    'db-migrate-ratings.js',
    'migrate_payments.js',
    'migrate_user_fields.js'
];

console.log('--- STARTING ALL MIGRATIONS ---');

for (const migration of migrations) {
    console.log(`\nRunning ${migration}...`);
    try {
        const output = execSync(`node ${path.join(__dirname, migration)}`, { encoding: 'utf-8' });
        console.log(output);
    } catch (error) {
        console.error(`Error running ${migration}:`);
        console.error(error.stdout || error.message);
        // Continue with others even if one fails (usually because columns already exist)
    }
}

console.log('\n--- ALL MIGRATIONS COMPLETED ---');
