import { pool } from './db.js';

const migrateSql = `
CREATE TABLE IF NOT EXISTS check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    checked_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checked_in_by UUID REFERENCES users(id),
    UNIQUE(registration_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_check_ins_registration ON check_ins(registration_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_checked_in_by ON check_ins(checked_in_by);
`;

async function migrate() {
    try {
        await pool.query(migrateSql);
        console.log('✅ check_ins table created successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
