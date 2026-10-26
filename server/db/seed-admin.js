/**
 * db/seed-admin.js
 *
 * Seeds one ADMIN account per department per admin designation,
 * and one FIELD_WORKER per department per field-worker designation.
 *
 * Reads departments from the DB (with dept_type) and maps them to
 * the DESIGNATIONS config — so this script stays in sync automatically
 * whenever designations.js is updated.
 *
 * Email pattern:
 *   {designation-slug}.{dept-type-slug}@nagarseva.in
 *   e.g. assistant-engineer.engineering@nagarseva.in
 *
 * Password (all accounts):  Admin@123  /  Worker@123
 *
 * Run: node db/seed-admin.js
 * Safe to re-run — skips existing emails.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool   = require('../src/config/db');
const { DESIGNATIONS } = require('../src/config/designations');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** 'Assistant Engineer (Civil)' → 'assistant-engineer-civil' */
function toSlug(str) {
  return str
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/** Upsert a single user — skips if email already exists. */
async function seedUser({ name, email, password, role, department_id, designation }) {
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    console.log(`  ⏭️  Skipped (exists): ${email}`);
    return;
  }
  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role, is_verified, department_id, designation)
     VALUES ($1, $2, $3, $4, TRUE, $5, $6)`,
    [name, email, hash, role, department_id, designation]
  );
  console.log(`  ✅ ${role.padEnd(12)} | ${designation.padEnd(38)} | ${email}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  try {
    // Load all departments that have a dept_type set
    const deptResult = await pool.query(
      `SELECT id, name, dept_type FROM departments
       WHERE deleted_at IS NULL AND dept_type IS NOT NULL
       ORDER BY id`
    );

    if (deptResult.rows.length === 0) {
      console.error('❌ No departments with dept_type found. Run migrations 008 + 009 first.');
      process.exit(1);
    }

    console.log(`\n🗄️  Seeding employees for ${deptResult.rows.length} departments...\n`);

    for (const dept of deptResult.rows) {
      const vocab = DESIGNATIONS[dept.dept_type];
      if (!vocab) {
        console.warn(`  ⚠️  No designations config for dept_type="${dept.dept_type}" (${dept.name}) — skipping.`);
        continue;
      }

      console.log(`\n📂 ${dept.name} [${dept.dept_type}] (id=${dept.id})`);

      // ── ADMIN designations ────────────────────────────────────────────────
      const adminDesignations = vocab.ADMIN || [];
      for (const designation of adminDesignations) {
        const slug  = toSlug(designation);
        const dSlug = toSlug(dept.dept_type);
        await seedUser({
          name:          designation,                         // Display name = designation title
          email:         `${slug}.${dSlug}@nagarseva.in`,
          password:      'Admin@123',
          role:          'ADMIN',
          department_id: dept.id,
          designation,
        });
      }

      // ── FIELD_WORKER designations ─────────────────────────────────────────
      const workerDesignations = vocab.FIELD_WORKER || [];
      for (const designation of workerDesignations) {
        const slug  = toSlug(designation);
        const dSlug = toSlug(dept.dept_type);
        await seedUser({
          name:          designation,
          email:         `${slug}.${dSlug}@nagarseva.in`,
          password:      'Worker@123',
          role:          'FIELD_WORKER',
          department_id: dept.id,
          designation,
        });
      }
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    const counts = await pool.query(`
      SELECT role, COUNT(*) AS count
      FROM users
      WHERE role IN ('ADMIN', 'FIELD_WORKER')
      GROUP BY role
    `);
    console.log('\n─────────────────────────────────────────────');
    console.log('📊 Current employee counts:');
    for (const row of counts.rows) {
      console.log(`   ${row.role.padEnd(14)} : ${row.count}`);
    }
    console.log('─────────────────────────────────────────────\n');

  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    console.error(err);
  } finally {
    await pool.end();
  }
}

seed();
