/**
 * db/migrate.js
 * Run all SQL migrations in order.
 * Usage: node db/migrate.js
 */
require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const pool = require('../src/config/db');

async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();   // alphabetical = ordered by 001_, 002_ prefix

  console.log('🗄️  Running migrations...\n');

  for (const file of files) {
    if (!file.endsWith('.sql')) continue;
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    try {
      await pool.query(sql);
      console.log(`  ✅ ${file}`);
    } catch (err) {
      console.error(`  ❌ ${file} — ${err.message}`);
      process.exit(1);
    }
  }

  console.log('\n✅ All migrations completed.');
  process.exit(0);
}

runMigrations();
