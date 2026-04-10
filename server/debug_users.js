import { pool } from './db.js';

async function checkUsers() {
    try {
        const res = await pool.query('SELECT username, email, phone, name, bio FROM users ORDER BY id DESC LIMIT 5');
        console.log(JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('Error fetching users:', error);
        process.exit(1);
    }
}

checkUsers();
