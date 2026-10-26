-- 010_issue_admin_designation.sql
-- Adds `assigned_admin_designation` to issues so SuperAdmin can route
-- an issue not just to a department but to a specific admin-level designation
-- (e.g. "Executive Engineer" vs "Assistant Engineer" in Engineering dept).
--
-- NULL means any admin in the department can pick it up.

ALTER TABLE issues
  ADD COLUMN IF NOT EXISTS assigned_admin_designation VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_issues_admin_designation
  ON issues (assigned_admin_designation);
