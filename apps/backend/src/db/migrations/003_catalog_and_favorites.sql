BEGIN;

-- Category and subcategory names are unique regardless of letter case ("Dairy" vs "dairy").
-- If this fails with a duplicate-key error, rename or merge the conflicting rows first.
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_lower
  ON categories (LOWER(name));
CREATE UNIQUE INDEX IF NOT EXISTS idx_subcategories_parent_name_lower
  ON subcategories (parent_category_id, LOWER(name));

-- Browse drill-down filters products by subcategory.
CREATE INDEX IF NOT EXISTS idx_products_subcategory
  ON products (subcategory_id) WHERE subcategory_id IS NOT NULL;

-- Favorites list is read newest-first per user.
CREATE INDEX IF NOT EXISTS idx_favorites_user_created
  ON favorites (user_id, created_at DESC);

-- Store rating aggregation (average + count) on every store card.
CREATE INDEX IF NOT EXISTS idx_reviews_store
  ON reviews (store_id) WHERE store_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_product
  ON reviews (product_id) WHERE product_id IS NOT NULL;

COMMIT;
