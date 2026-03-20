import { pool } from './db.js';

async function migrate() {
    try {
        await pool.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS additional_images JSONB DEFAULT '[]'::jsonb");
        console.log("DB_MIGRATED_SUCCESSFULLY");
        process.exit(0);
    } catch (err) {
        console.error("MIGRATION_ERROR:", err);
        process.exit(1);
    }
}
migrate();
