require('dotenv').config();

const { Pool } = require('pg');

const isLocal = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');
const useSsl = process.env.DB_SSL === 'true' || (!isLocal && process.env.DB_SSL !== 'false');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSsl ? { rejectUnauthorized: false } : false
});

pool.on('error', (error) => {
    console.error('Unexpected PostgreSQL error:', error.message);
});

module.exports = pool;