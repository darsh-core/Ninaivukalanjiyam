require('dotenv').config();
const { Client } = require('pg');

async function initDatabase() {
    const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:production_strong_password@localhost:5432/NinaivuKalanjiyam';
    
    // Parse target DB name
    const urlObj = new URL(dbUrl);
    const targetDbName = decodeURIComponent(urlObj.pathname.replace(/^\//, ''));
    
    // Connect to maintenance DB ('postgres') to check/create target database
    urlObj.pathname = '/postgres';
    const maintenanceUrl = urlObj.toString();
    
    console.log(`Connecting to PostgreSQL maintenance database to check "${targetDbName}"...`);
    const client = new Client({
        connectionString: maintenanceUrl,
        ssl: false
    });

    try {
        await client.connect();
        console.log('Connected to PostgreSQL server successfully.');

        // Check if database exists
        const checkRes = await client.query(
            'SELECT 1 FROM pg_database WHERE datname = $1',
            [targetDbName]
        );

        if (checkRes.rows.length === 0) {
            console.log(`Database "${targetDbName}" does not exist. Creating it now...`);
            // Escape double quotes in database name
            const safeDbName = targetDbName.replace(/"/g, '""');
            await client.query(`CREATE DATABASE "${safeDbName}";`);
            console.log(`✅ Database "${targetDbName}" created successfully!`);
        } else {
            console.log(`Database "${targetDbName}" already exists.`);
        }
    } catch (err) {
        console.error('Error checking/creating database:', err.message);
        throw err;
    } finally {
        await client.end().catch(() => {});
    }
}

initDatabase().catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
