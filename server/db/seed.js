/**
 * db/seed.js
 * Combined seeder for SuperAdmin, Department Admins, and Field Workers.
 * Usage: npm run seed
 */
require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');

console.log('🌱 Starting database seeding...\n');

try {
  console.log('--- Seeding SuperAdmin ---');
  execSync(`node "${path.join(__dirname, 'seed-super-admin.js')}"`, { stdio: 'inherit' });

  console.log('\n--- Seeding Department Admins & Field Workers ---');
  execSync(`node "${path.join(__dirname, 'seed-admin.js')}"`, { stdio: 'inherit' });

  console.log('\n✅ Database seeding finished successfully.');
} catch (error) {
  console.error('\n❌ Seeding failed:', error.message);
  process.exit(1);
}
