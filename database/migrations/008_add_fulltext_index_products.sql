-- Add full text search index to products table
-- This migration adds a full text index on name, description, product_code, and sku_id columns

-- Drop existing full text index if it exists
DROP INDEX IF EXISTS idx_products_fulltext ON products;

-- Add full text search index
ALTER TABLE products ADD FULLTEXT INDEX idx_products_fulltext (name, description, product_code, sku_id);

-- Verify the index was created
SHOW INDEX FROM products WHERE Key_name = 'idx_products_fulltext';
