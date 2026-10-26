-- Drop the check constraint on departments.dept_type to allow custom classifications
ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_dept_type_check;
