-- 009_designation.sql
-- Adds:
--   1. `designation` column on users  — stores real-world ULB job title
--   2. `dept_type`   column on departments — machine-readable type for programmatic designation lookup

-- ─── 1. Add designation to users ────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS designation VARCHAR(100);

-- ─── 2. Add dept_type to departments ────────────────────────────────────────
ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS dept_type VARCHAR(50)
  CHECK (dept_type IN (
    'ENGINEERING',
    'WATER_SUPPLY',
    'SANITATION',
    'STREET_LIGHTING',
    'ENCROACHMENT',
    'ANIMAL_CONTROL',
    'HORTICULTURE',
    'GENERAL'
  ));

-- ─── 3. Backfill dept_type for seeded departments ───────────────────────────
UPDATE departments SET dept_type = 'ENGINEERING'     WHERE name = 'Road & Infrastructure';
UPDATE departments SET dept_type = 'WATER_SUPPLY'    WHERE name = 'Water Supply & Drainage';
UPDATE departments SET dept_type = 'SANITATION'      WHERE name = 'Sanitation & Waste';
UPDATE departments SET dept_type = 'STREET_LIGHTING' WHERE name = 'Street Lighting';
UPDATE departments SET dept_type = 'HORTICULTURE'    WHERE name = 'Parks & Environment';
UPDATE departments SET dept_type = 'ENCROACHMENT'    WHERE name = 'Encroachment & Land';
UPDATE departments SET dept_type = 'ANIMAL_CONTROL'  WHERE name = 'Animal Control';
UPDATE departments SET dept_type = 'GENERAL'         WHERE name = 'General / Other';
