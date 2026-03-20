import { pool } from './db.js';

const run = async () => {
    try {
        await pool.query('ALTER TABLE registrations ADD COLUMN IF NOT EXISTS device_info VARCHAR(255)');
        console.log('device_info column added successfully!');
    } catch (err) {
        console.error('Failed to add column:', err.message);
    }
    process.exit(0);
};

run();
