import { pool } from './db.js';

async function getSchema() {
    try {
        const columns = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'event_reviews'
            ORDER BY ordinal_position
        `);
        
        const constraints = await pool.query(`
            SELECT conname, pg_get_constraintdef(c.oid) as definition
            FROM pg_constraint c
            JOIN pg_namespace n ON n.oid = c.connamespace
            WHERE conrelid = 'event_reviews'::regclass
        `);

        console.log('--- COLUMNS ---');
        console.log(JSON.stringify(columns.rows, null, 2));
        console.log('--- CONSTRAINTS ---');
        console.log(JSON.stringify(constraints.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
getSchema();
