-- 008_departments_and_relations.sql
-- Creates departments table, links users and issues to departments, adds assignment field.

CREATE TABLE IF NOT EXISTS departments (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TIMESTAMPTZ NULL  -- soft delete
);

-- Link users to departments
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id INT REFERENCES departments(id);
CREATE INDEX IF NOT EXISTS idx_users_department_id ON users (department_id);

-- Link issues to departments and field workers (replace old string column)
ALTER TABLE issues DROP COLUMN IF EXISTS assigned_dept;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS department_id INT REFERENCES departments(id);
ALTER TABLE issues ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_issues_department_id ON issues (department_id);
CREATE INDEX IF NOT EXISTS idx_issues_assigned_to ON issues (assigned_to);

-- Seed initial departments
INSERT INTO departments (name) VALUES
  ('Road & Infrastructure'),
  ('Water Supply & Drainage'),
  ('Sanitation & Waste'),
  ('Street Lighting'),
  ('Parks & Environment'),
  ('Encroachment & Land'),
  ('Animal Control'),
  ('General / Other')
ON CONFLICT (name) DO NOTHING;
