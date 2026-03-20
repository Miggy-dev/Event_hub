import { pool } from './db.js';

async function migrateRatings() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS event_reviews (
                id UUID PRIMARY KEY,
                event_id UUID REFERENCES events(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                rating INTEGER CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(event_id, user_id)
            )
        `);
        console.log("DB_RATING_MIGRATED_SUCCESSFULLY");
        process.exit(0);
    } catch (err) {
        console.error("MIGRATION_ERROR:", err);
        process.exit(1);
    }
}
migrateRatings();
