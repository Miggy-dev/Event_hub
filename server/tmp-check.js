import { pool } from './db.js';

pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'events'").then(res => {
    console.log("Columns:", res.rows.map(r => r.column_name));
    process.exit(0);
}).catch(err => {
    console.error("DB Error:", err);
    process.exit(1);
});
