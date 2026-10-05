-- Reviews can be edited; null means "never edited".
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

-- Review lists are read newest first, per store or product, and per reviewer.
CREATE INDEX IF NOT EXISTS idx_reviews_store_created
  ON reviews (store_id, created_at DESC) WHERE store_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_product_created
  ON reviews (product_id, created_at DESC) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_user_created
  ON reviews (user_id, created_at DESC);

-- Admin user search filters on role and is_suspended.
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC);
