BEGIN;

-- 1. Lowercase Email Index & Data Normalization
UPDATE users SET email = LOWER(email) WHERE email <> LOWER(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));

-- 2. Household List Items: Add item_name, backfill, set NOT NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'household_list_items' AND column_name = 'item_name'
  ) THEN
    ALTER TABLE household_list_items ADD COLUMN item_name VARCHAR(255);
    
    UPDATE household_list_items i
    SET item_name = COALESCE(
      i.custom_item_name,
      (SELECT p.name FROM products p WHERE p.id = i.product_id),
      'Item'
    );
    
    ALTER TABLE household_list_items ALTER COLUMN item_name SET NOT NULL;
  END IF;
END $$;

-- 3. Products Search Column & Indexes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'search_tsv'
  ) THEN
    ALTER TABLE products ADD COLUMN search_tsv tsvector GENERATED ALWAYS AS (
      to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
    ) STORED;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_search_tsv ON products USING gin (search_tsv);
CREATE INDEX IF NOT EXISTS idx_products_embedding ON products USING hnsw (embedding vector_l2_ops);

-- 4. Admin Audit Logs Snapshot Email & Name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_audit_logs' AND column_name = 'admin_email'
  ) THEN
    ALTER TABLE admin_audit_logs ADD COLUMN admin_email VARCHAR(255);
    ALTER TABLE admin_audit_logs ADD COLUMN admin_name VARCHAR(100);
  END IF;
END $$;

COMMIT;
