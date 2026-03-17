import pkg from 'pg';
const { Client } = pkg;

async function testConnection() {
    const password = 'miguel@10';
    console.log(`Testing connection with password: "${password}"`);
    
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'postgres',
        password: password,
        port: 5432,
        ssl: false
    });

    try {
        await client.connect();
        console.log('✅ Successfully connected to "postgres" database!');
        
        // Check if eventhub exists
        const res = await client.query("SELECT 1 FROM pg_database WHERE datname='eventhub'");
        if (res.rows.length > 0) {
            console.log('✅ "eventhub" database exists.');
        } else {
            console.log('❌ "eventhub" database DOES NOT EXIST.');
            console.log('Creating "eventhub" database...');
            await client.query('CREATE DATABASE eventhub');
            console.log('✅ "eventhub" database created successfully.');
        }
        await client.end();
        process.exit(0);
    } catch (err) {
        console.log(`❌ Failed to connect: ${err.message}`);
        console.log('Full error:', err);
        process.exit(1);
    }
}

testConnection();
