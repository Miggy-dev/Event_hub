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
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'eventhub',
    password: process.env.DB_PASS || 'miguel@10',
    port: process.env.DB_PORT || 5432,
    ssl: isProduction ? { rejectUnauthorized: false } : false
});

console.log('--- Database Config ---');
console.log('User:', process.env.DB_USER);
console.log('Database:', process.env.DB_NAME);
console.log('SSL:', isProduction ? 'Enabled' : 'Disabled');
console.log('-----------------------');
