-- Rename ai_app_content_library to content_library
-- This makes the table name more generic and descriptive

-- Rename the table
ALTER TABLE ai_app_content_library RENAME TO content_library;

-- Rename the self-referencing foreign key constraint
ALTER TABLE content_library 
DROP CONSTRAINT IF EXISTS ai_app_content_library_parent_doc_id_fkey;

ALTER TABLE content_library
ADD CONSTRAINT content_library_parent_doc_id_fkey 
FOREIGN KEY (parent_doc_id) REFERENCES content_library(id) ON DELETE CASCADE;

-- Rename indexes
ALTER INDEX IF EXISTS ai_app_content_library_pkey RENAME TO content_library_pkey;
ALTER INDEX IF EXISTS idx_content_library_project RENAME TO idx_content_library_project_id;
ALTER INDEX IF EXISTS idx_content_library_company RENAME TO idx_content_library_company_id;
ALTER INDEX IF EXISTS idx_content_library_capability RENAME TO idx_content_library_capability_id;

-- Update RLS policies with new table name
DROP POLICY IF EXISTS "Users can view content in their tenant" ON content_library;
CREATE POLICY "Users can view content in their tenant"
ON content_library FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
  )
  OR visibility = 'public'
  OR is_platform_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can manage content in their tenant" ON content_library;
CREATE POLICY "Users can manage content in their tenant"
ON content_library FOR ALL
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('tenant_owner', 'tenant_admin', 'platform_owner', 'platform_admin')
  )
  OR created_by = auth.uid()
  OR is_platform_admin(auth.uid())
)
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('tenant_owner', 'tenant_admin', 'platform_owner', 'platform_admin')
  )
  OR is_platform_admin(auth.uid())
);

-- Update table comment
COMMENT ON TABLE content_library IS 
'General content/document library for all capabilities. Supports:
- Multi-tenant isolation via tenant_id
- Project-specific documents via project_id
- Company documents via company_id
- Capability-specific documents via capability_id
- AI-ready with extracted_text and keywords
- Large file chunking via chunk_index/parent_doc_id
- Full-text search via GIN index';

