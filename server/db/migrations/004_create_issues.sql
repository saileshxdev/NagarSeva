CREATE TABLE IF NOT EXISTS issues (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    short_id      VARCHAR(20) UNIQUE NOT NULL,  -- e.g., "ISS-2025-0042"
    reporter_id   UUID REFERENCES users(id),
    category      VARCHAR(50) NOT NULL 
                  CHECK (category IN (
                    'POTHOLE', 'STREETLIGHT', 'SEWAGE', 'GARBAGE', 'WATER_SUPPLY', 
                    'ROAD_DAMAGE', 'ENCROACHMENT', 'STRAY_ANIMALS', 'DEAD_ANIMAL', 
                    'PUBLIC_TOILET', 'DRAIN_BLOCKAGE', 'FALLEN_TREE', 'ABANDONED_VEHICLE', 
                    'AIR_POLLUTION', 'OTHER'  
                  )),
    description   TEXT,
    location      GEOGRAPHY(POINT, 4326) NOT NULL,  -- PostGIS geography type
    address       TEXT,  -- reverse-geocoded or user-entered
    ward          INTEGER,
    status        VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED'
                  CHECK (status IN (
                    'SUBMITTED', 'VERIFIED', 'REJECTED', 'ASSIGNED',
                    'IN_PROGRESS', 'RESOLVED', 'NOT_SATISFIED'
                  )),
    priority_score DECIMAL(5,2) DEFAULT 0,
    report_count  INTEGER DEFAULT 1,  -- incremented on duplicate merge
    assigned_dept VARCHAR(50),
    resolved_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- THE KEY INDEX: makes spatial queries fast
CREATE INDEX IF NOT EXISTS idx_issues_location ON issues USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues (status);
CREATE INDEX IF NOT EXISTS idx_issues_category ON issues (category);