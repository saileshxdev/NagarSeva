-- Update existing status values in issues table
UPDATE issues SET status = 'NOT_SATISFIED' WHERE status IN ('CLOSED', 'REOPENED');

-- Drop the old constraint
ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_status_check;

-- Add the new constraint
ALTER TABLE issues ADD CONSTRAINT issues_status_check 
  CHECK (status IN (
    'SUBMITTED', 'VERIFIED', 'REJECTED', 'ASSIGNED',
    'IN_PROGRESS', 'RESOLVED', 'NOT_SATISFIED'
  ));
