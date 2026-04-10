import { pool } from './db.js';

async function migrate() {
    try {
        console.log('Starting migration...');
        
        // Add phone and email columns if they don't exist
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
            ADD COLUMN IF NOT EXISTS email VARCHAR(255);
        `);
        
        // Copy username to email if email is currently NULL (optional, but good for backward compatibility)
        await pool.query(`
            UPDATE users SET email = username WHERE email IS NULL;
        `);
        
        console.log('Migration successful!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
