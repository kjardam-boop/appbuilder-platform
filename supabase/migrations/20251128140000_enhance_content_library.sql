-- Enhance content_library for use as general document archive
-- Adds project, company, and capability linkages

-- Add project_id for linking documents to customer app projects
ALTER TABLE content_library 
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES customer_app_projects(id) ON DELETE SET NULL;

-- Add company_id for linking documents to companies
ALTER TABLE content_library 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL;

-- Add capability_id for capability-specific documents
ALTER TABLE content_library 
ADD COLUMN IF NOT EXISTS capability_id uuid REFERENCES capabilities(id) ON DELETE SET NULL;

-- Add source_type for tracking document origin
ALTER TABLE content_library 
ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'upload';
-- Values: 'upload', 'ai_generated', 'external_import', 'system'

-- Add visibility for access control
ALTER TABLE content_library 
ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private';
-- Values: 'private', 'project', 'tenant', 'public'

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_content_library_project 
ON content_library(project_id) WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_library_company 
ON content_library(company_id) WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_library_capability 
ON content_library(capability_id) WHERE capability_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_library_visibility 
ON content_library(visibility);

-- Full-text search index on title and extracted_text
CREATE INDEX IF NOT EXISTS idx_content_library_search 
ON content_library USING gin(
  to_tsvector('norwegian', coalesce(title, '') || ' ' || coalesce(extracted_text, ''))
);

-- Update RLS policies to include new columns
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

-- Comment explaining the table's purpose
COMMENT ON TABLE content_library IS 
'General document archive for all capabilities. Supports:
- Multi-tenant isolation via tenant_id
- Project-specific documents via project_id
- Company documents via company_id
- Capability-specific documents via capability_id
- AI-ready with extracted_text and keywords
- Large file chunking via chunk_index/parent_doc_id
- Full-text search via GIN index';

