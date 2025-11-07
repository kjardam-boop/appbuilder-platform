-- Remove branding column from customer_app_projects
-- All apps now reference tenant_themes.tokens instead of storing a copy

ALTER TABLE customer_app_projects 
DROP COLUMN IF EXISTS branding;

COMMENT ON TABLE customer_app_projects IS 'Customer app projects now reference tenant_themes for branding instead of storing a copy';