const { Client } = require('pg');

async function ensureDatabaseExists() {
    const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:production_strong_password@localhost:5432/NinaivuKalanjiyam';
    
    // Only attempt auto-creation on local PostgreSQL connections
    const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') || dbUrl.includes('::1');
    if (!isLocal) return;

    try {
        const urlObj = new URL(dbUrl);
        const targetDbName = decodeURIComponent(urlObj.pathname.replace(/^\//, ''));
        if (!targetDbName) return;

        // Switch to default maintenance database
        urlObj.pathname = '/postgres';
        const maintenanceUrl = urlObj.toString();

        const client = new Client({
            connectionString: maintenanceUrl,
            ssl: false
        });

        await client.connect();
        const checkRes = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [targetDbName]);
        if (checkRes.rows.length === 0) {
            console.log(`Database "${targetDbName}" not found. Creating database automatically...`);
            const safeName = targetDbName.replace(/"/g, '""');
            await client.query(`CREATE DATABASE "${safeName}";`);
            console.log(`✅ Database "${targetDbName}" created successfully.`);
        }
        await client.end().catch(() => {});
    } catch (err) {
        // Log notice but don't fail ungracefully (user may have restricted permissions)
        console.warn('Auto-create database notice:', err.message);
    }
}

module.exports = ensureDatabaseExists;
