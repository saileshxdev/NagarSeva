CREATE TABLE IF NOT EXISTS issue_images (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id      UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    uploader_id   UUID REFERENCES users(id),  -- Connects to the citizen OR the field worker
    image_url     TEXT NOT NULL,
    
    -- This is the crucial part for your use case:
    image_type    VARCHAR(20) NOT NULL DEFAULT 'REPORT'
                  CHECK (image_type IN (
                      'REPORT',             -- Uploaded by citizen when reporting
                      'PROGRESS',           -- Uploaded by worker while fixing
                      'RESOLUTION_PROOF'    -- Uploaded by worker when closing the ticket
                  )),
                  
    uploaded_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast retrieval when loading an issue page
CREATE INDEX IF NOT EXISTS idx_issue_images_issue_id ON issue_images(issue_id);