import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from BOTH the server directory and the root directory as a fallback
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const isProduction = process.env.NODE_ENV === 'production';

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false
});

if (!process.env.DATABASE_URL) {
    console.warn('WARNING: DATABASE_URL is not defined in environment variables.');
}

console.log('--- Database Config ---');
console.log('DATABASE_URL Present:', !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
    const host = process.env.DATABASE_URL.match(/@([^/]+)/)?.[1];
    console.log('Database Host:', host || 'Unknown');
}
console.log('SSL Mode:', isProduction ? 'Enabled' : 'Disabled');
console.log('-----------------------');
