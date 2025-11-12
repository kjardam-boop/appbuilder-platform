-- Create validation function for table naming conventions

CREATE OR REPLACE FUNCTION validate_table_naming()
RETURNS TABLE(
  table_name TEXT,
  issue TEXT,
  suggestion TEXT,
  severity TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH table_analysis AS (
    SELECT 
      t.table_name::TEXT as tbl_name,
      t.table_name LIKE '%\_%' as has_underscore,
      EXISTS (
        SELECT 1 FROM app_definitions ad 
        WHERE t.table_name = ANY(ad.domain_tables)
      ) as registered_in_app,
      -- Check if it looks like an app table (has underscore prefix pattern)
      (t.table_name ~ '^[a-z0-9]+_[a-z0-9_]+$') as looks_like_app_table,
      -- Check if table has tenant_id column
      EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = t.table_name
          AND c.column_name = 'tenant_id'
      ) as has_tenant_id,
      -- Check if RLS is enabled
      EXISTS (
        SELECT 1 FROM pg_tables pt
        WHERE pt.schemaname = 'public'
          AND pt.tablename = t.table_name
          AND pt.rowsecurity = true
      ) as has_rls
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND t.table_name NOT LIKE 'pg_%'
      AND t.table_name NOT LIKE 'sql_%'
  )
  SELECT 
    ta.tbl_name,
    CASE
      -- Check 1: App-like table not registered
      WHEN ta.looks_like_app_table AND NOT ta.registered_in_app THEN
        'Has app-like prefix but not registered in any app_definition.domain_tables'
      
      -- Check 2: App table missing tenant_id
      WHEN ta.registered_in_app AND NOT ta.has_tenant_id THEN
        'Registered as app domain table but missing tenant_id column'
      
      -- Check 3: App table missing RLS
      WHEN ta.registered_in_app AND NOT ta.has_rls THEN
        'Registered as app domain table but RLS not enabled'
      
      -- Check 4: Has underscore but not following app convention
      WHEN ta.has_underscore 
           AND NOT ta.looks_like_app_table
           AND NOT ta.registered_in_app THEN
        'Contains underscore but does not follow naming convention (should be {app_key}_{table})'
      
      ELSE 'OK'
    END as issue,
    CASE
      WHEN ta.looks_like_app_table AND NOT ta.registered_in_app THEN
        'Add table to domain_tables array in appropriate app_definition'
      
      WHEN ta.registered_in_app AND NOT ta.has_tenant_id THEN
        'ALTER TABLE ' || ta.tbl_name || ' ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE'
      
      WHEN ta.registered_in_app AND NOT ta.has_rls THEN
        'ALTER TABLE ' || ta.tbl_name || ' ENABLE ROW LEVEL SECURITY'
      
      WHEN ta.has_underscore 
           AND NOT ta.looks_like_app_table
           AND NOT ta.registered_in_app THEN
        'Rename table or register in app_definitions'
      
      ELSE 'No action needed'
    END as suggestion,
    CASE
      WHEN ta.registered_in_app AND NOT ta.has_tenant_id THEN 'ERROR'
      WHEN ta.registered_in_app AND NOT ta.has_rls THEN 'ERROR'
      WHEN ta.looks_like_app_table AND NOT ta.registered_in_app THEN 'WARN'
      WHEN ta.has_underscore 
           AND NOT ta.looks_like_app_table
           AND NOT ta.registered_in_app THEN 'WARN'
      ELSE 'INFO'
    END as severity
  FROM table_analysis ta
  ORDER BY 
    CASE 
      WHEN issue = 'OK' THEN 3
      WHEN ta.registered_in_app THEN 1
      ELSE 2
    END,
    ta.tbl_name;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION validate_table_naming() TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION validate_table_naming() IS 
'Validates that database tables follow the platform naming conventions. 
Returns a list of tables with naming issues and suggestions for fixing them.
Run: SELECT * FROM validate_table_naming() WHERE issue != ''OK'';';

-- Create a view for easy access to validation results
CREATE OR REPLACE VIEW table_naming_validation AS
SELECT * FROM validate_table_naming();

COMMENT ON VIEW table_naming_validation IS 
'Real-time view of table naming convention compliance. 
Shows all tables and their naming validation status.';