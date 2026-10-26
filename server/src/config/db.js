const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';
const requiresSsl = isProduction || 
  Boolean(process.env.DATABASE_URL && (
    process.env.DATABASE_URL.includes('sslmode=require') || 
    process.env.DATABASE_URL.includes('neon.tech') || 
    process.env.DATABASE_URL.includes('supabase.co') || 
    process.env.DATABASE_URL.includes('render.com') ||
    process.env.DATABASE_URL.includes('railway.app')
  ));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // SSL required for Neon (and most cloud Postgres providers)
  ssl: requiresSsl ? { rejectUnauthorized: false } : false,
  // Connection pool settings
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,  // 10s for cold-start cloud DBs
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    return;
  }
  release();
  console.log('✅ Database connected');
});

module.exports = pool;
