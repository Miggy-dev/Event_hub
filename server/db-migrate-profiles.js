import { pool } from './db.js';

const migrateSql = `
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
`;

async function migrate() {
    try {
        console.log('Starting User Profiles migration...');
        await pool.query(migrateSql);
        console.log('User profiles migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
