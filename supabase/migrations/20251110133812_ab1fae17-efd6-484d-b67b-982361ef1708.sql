-- Rename core tables
ALTER TABLE app_vendors RENAME TO external_system_vendors;
ALTER TABLE app_products RENAME TO external_systems;
ALTER TABLE app_integrations RENAME TO external_system_integrations;
ALTER TABLE app_product_mcp_actions RENAME TO external_system_mcp_actions;
ALTER TABLE app_integration_patterns RENAME TO external_system_integration_patterns;
ALTER TABLE company_apps RENAME TO company_external_systems;

-- Rename columns that reference app_product to external_system
ALTER TABLE external_system_integrations RENAME COLUMN app_product_id TO external_system_id;
ALTER TABLE external_system_mcp_actions RENAME COLUMN app_product_id TO external_system_id;
ALTER TABLE company_external_systems RENAME COLUMN app_product_id TO external_system_id;
ALTER TABLE erp_extensions RENAME COLUMN app_product_id TO external_system_id;

-- Update integration patterns columns
ALTER TABLE external_system_integration_patterns RENAME COLUMN source_product_id TO source_system_id;
ALTER TABLE external_system_integration_patterns RENAME COLUMN target_product_id TO target_system_id;

-- Rename indexes and constraints that reference the old table names
-- Foreign key constraints will be automatically renamed by PostgreSQL when tables are renamed

-- Update any remaining sequences or other dependent objects
-- (PostgreSQL automatically handles most of these when tables are renamed)

-- Add comments to document the renamed tables
COMMENT ON TABLE external_systems IS 'External business systems/applications (formerly app_products)';
COMMENT ON TABLE external_system_vendors IS 'Vendors/suppliers of external systems (formerly app_vendors)';
COMMENT ON TABLE external_system_integrations IS 'Integration details for external systems (formerly app_integrations)';
COMMENT ON TABLE external_system_mcp_actions IS 'MCP actions available for external systems (formerly app_product_mcp_actions)';
COMMENT ON TABLE external_system_integration_patterns IS 'Integration patterns between systems (formerly app_integration_patterns)';
COMMENT ON TABLE company_external_systems IS 'Systems used by companies (formerly company_apps)';

-- Update views if they exist and reference old table names
-- Note: Views will need to be recreated manually if they exist