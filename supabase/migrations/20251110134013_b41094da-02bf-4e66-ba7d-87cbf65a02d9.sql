-- Rename SKU table to match naming convention
ALTER TABLE skus RENAME TO external_system_skus;

-- Rename the foreign key column
ALTER TABLE external_system_skus RENAME COLUMN app_product_id TO external_system_id;

-- Add comment to document the table
COMMENT ON TABLE external_system_skus IS 'Product variants/editions for external systems (formerly skus with app_product_id)';