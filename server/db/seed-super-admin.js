/**
 * db/seed-super-admin.js
 *
 * Creates a SUPER_ADMIN user for testing.
 * Run: node db/seed-super-admin.js
 *
 * Credentials:
 *   Email:    superadmin@nagarseva.in
 *   Password: SuperAdmin@123
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool   = require('../src/config/db');

async function seedSuperAdmin() {
  const email    = 'superadmin@nagarseva.in';
  const password = 'SuperAdmin@123';
  const name     = 'Super Admin';
  const role     = 'SUPER_ADMIN';

  try {
    // Check if already exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      console.log(`✅ SuperAdmin already exists (${email})`);
      process.exit(0);
    }

    const password_hash = await bcrypt.hash(password, 12);

    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, is_verified)
       VALUES ($1, $2, $3, $4, TRUE)`,
      [name, email, password_hash, role]
    );

    console.log(`✅ SuperAdmin created successfully!`);
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role:     ${role}`);
  } catch (err) {
    console.error('❌ Failed to seed SuperAdmin:', err.message);
  } finally {
    await pool.end();
  }
}

seedSuperAdmin();
