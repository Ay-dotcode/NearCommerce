-- Product images uploaded by store owners. Stored in Postgres so they survive redeploys on
-- hosts with ephemeral disks and need no separate storage vendor. Rows are immutable; a
-- product references an image through its image_url (/api/images/<id>).
CREATE TABLE IF NOT EXISTS uploaded_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type VARCHAR(32) NOT NULL,
    byte_size INTEGER NOT NULL CHECK (byte_size > 0),
    data BYTEA NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_uploaded_images_owner ON uploaded_images(owner_id, created_at);
