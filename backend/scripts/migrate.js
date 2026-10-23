const fs = require('fs');
const path = require('path');
const ensureDatabaseExists = require('../src/config/ensureDatabase');
const pool = require('../src/config/database');

async function runMigrations() {
    await ensureDatabaseExists();
    console.log('--- Running NinaivuKalanjiyam Database Migrations ---');
    const migrationsDir = path.join(__dirname, '../../database/migrations');

    if (!fs.existsSync(migrationsDir)) {
        console.error(`Migrations folder not found at: ${migrationsDir}`);
        process.exit(1);
    }

    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    console.log(`Found ${files.length} migration file(s):`, files);

    for (const file of files) {
        const filePath = path.join(migrationsDir, file);
        console.log(`\nExecuting migration: ${file}...`);
        const sql = fs.readFileSync(filePath, 'utf8');

        try {
            await pool.query(sql);
            console.log(`✅ Successfully executed: ${file}`);
        } catch (err) {
            console.error(`❌ Migration error in ${file}:`, err.message);
            // Don't exit if it's already created / duplicate key error during idempotent seed
            if (!err.message.includes('already exists') && !err.message.includes('duplicate key')) {
                throw err;
            }
        }
    }

    // Restore backup data (advika, narrators, recordings, transcripts) if it exists
    const backupFile = path.join(__dirname, '../../database/backup_data.sql');
    if (fs.existsSync(backupFile)) {
        console.log('\n--- Restoring data from database/backup_data.sql ---');
        const backupSql = fs.readFileSync(backupFile, 'utf8');
        try {
            await pool.query(backupSql);
            console.log('✅ Successfully restored all backup data (users, narrators, recordings, transcripts)!');
        } catch (backupErr) {
            console.warn('⚠️ Backup restore notice:', backupErr.message);
        }
    }

    console.log('\n--- All database migrations executed successfully! ---');
    await pool.end();
    process.exit(0);
}

runMigrations().catch(err => {
    console.error('Fatal migration failure:', err);
    process.exit(1);
});
