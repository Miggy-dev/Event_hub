import { pool } from './db.js';

async function migrate() {
    try {
        console.log('--- STARTING PAYMENT MIGRATION ---');
        
        // 1. Add payment_method
        await pool.query(`
            ALTER TABLE registrations 
            ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'Person-to-Person'
        `);
        console.log('Added payment_method column');

        // 2. Add platform_fee
        await pool.query(`
            ALTER TABLE registrations 
            ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10, 2) DEFAULT 2.00
        `);
        console.log('Added platform_fee column');

        // 3. Add organizer_revenue
        await pool.query(`
            ALTER TABLE registrations 
            ADD COLUMN IF NOT EXISTS organizer_revenue DECIMAL(10, 2) DEFAULT 0.00
        `);
        console.log('Added organizer_revenue column');

        // 4. Update existing records (backfill)
        await pool.query(`
            UPDATE registrations 
            SET organizer_revenue = total_price, 
                platform_fee = 0 
            WHERE organizer_revenue = 0 AND total_price > 0
        `);
        console.log('Backfilled existing registrations');

        console.log('--- MIGRATION SUCCESSFUL ---');
        process.exit(0);
    } catch (error) {
        console.error('--- MIGRATION FAILED ---');
        console.error(error);
        process.exit(1);
    }
}

migrate();
