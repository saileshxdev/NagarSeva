require('dotenv').config();
const pool = require('../src/config/db');

async function run() {
  const updates = [
    ['Road & Infrastructure', 'ENGINEERING'],
    ['Water Supply & Drainage', 'WATER_SUPPLY'],
    ['Sanitation & Waste', 'SANITATION'],
    ['Street Lighting', 'STREET_LIGHTING'],
    ['Parks & Environment', 'HORTICULTURE'],
    ['Encroachment & Land', 'ENCROACHMENT'],
    ['Animal Control', 'ANIMAL_CONTROL'],
    ['General / Other', 'GENERAL'],
  ];

  for (const [name, type] of updates) {
    await pool.query('UPDATE departments SET dept_type = $1 WHERE name = $2', [type, name]);
  }
  console.log('✅ dept_type values set for all departments');
  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
