-- Enhancement: Add file storage support to ai_app_content_library
-- Supports .md files now, PDF/DOCX later

-- Add file storage columns
ALTER TABLE public.ai_app_content_library
ADD COLUMN IF NOT EXISTS file_storage_path TEXT,
ADD COLUMN IF NOT EXISTS file_type TEXT DEFAULT 'markdown',
ADD COLUMN IF NOT EXISTS file_size_bytes INTEGER,
ADD COLUMN IF NOT EXISTS original_filename TEXT,
ADD COLUMN IF NOT EXISTS extracted_text TEXT,
ADD COLUMN IF NOT EXISTS last_processed_at TIMESTAMPTZ;

-- Add constraints
ALTER TABLE public.ai_app_content_library
ADD CONSTRAINT valid_file_type CHECK (
  file_type IN ('markdown', 'pdf', 'docx', 'txt', 'html')
);

ALTER TABLE public.ai_app_content_library
ADD CONSTRAINT reasonable_file_size CHECK (
  file_size_bytes IS NULL OR file_size_bytes <= 10485760  -- 10MB max
);

-- Create Supabase Storage bucket for content files
-- Note: This must be done via Supabase Dashboard or via storage.buckets insert
-- bucket name: 'ai-content-files'

-- Storage bucket policies (to be applied after bucket creation):
-- Policy 1: Platform admins can upload/manage all files
-- Policy 2: Tenant admins can upload/manage their tenant's files only
-- Policy 3: Authenticated users can read files (for AI generation)

COMMENT ON COLUMN public.ai_app_content_library.file_storage_path IS 'Path in Supabase Storage bucket, e.g., platform/onboarding.md or {tenant_id}/guide.pdf';
COMMENT ON COLUMN public.ai_app_content_library.file_type IS 'File type: markdown, pdf, docx, txt, html';
COMMENT ON COLUMN public.ai_app_content_library.file_size_bytes IS 'File size in bytes, max 10MB';
COMMENT ON COLUMN public.ai_app_content_library.original_filename IS 'Original uploaded filename';
COMMENT ON COLUMN public.ai_app_content_library.extracted_text IS 'For PDFs/DOCX: extracted text for search. For markdown: same as content_markdown';

-- Create index for file paths
CREATE INDEX IF NOT EXISTS idx_ai_content_file_path ON public.ai_app_content_library(file_storage_path);
CREATE INDEX IF NOT EXISTS idx_ai_content_file_type ON public.ai_app_content_library(file_type);

-- Function to help with storage bucket policy checks
-- Note: is_platform_admin already exists with _user_id param, so we use that name
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = _user_id
    AND user_roles.role IN ('platform_owner', 'platform_admin', 'platform_support')
    AND user_roles.scope_type = 'platform'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = _user_id
    AND user_roles.role IN ('tenant_owner', 'tenant_admin')
    AND user_roles.scope_type = 'tenant'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_tenant(_user_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT user_roles.scope_id
    FROM public.user_roles
    WHERE user_roles.user_id = _user_id
    AND user_roles.scope_type = 'tenant'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies to include file storage checks
-- Platform admins can manage files anywhere
CREATE POLICY "Platform admins manage content files" 
  ON public.ai_app_content_library
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- Tenant admins can only manage their tenant's files
CREATE POLICY "Tenant admins manage tenant content files"
  ON public.ai_app_content_library
  FOR ALL
  TO authenticated
  USING (
    public.is_tenant_admin(auth.uid())
    AND (
      tenant_id IS NULL  -- Can see platform content
      OR tenant_id = public.get_user_tenant(auth.uid())  -- Or their own
    )
  )
  WITH CHECK (
    public.is_tenant_admin(auth.uid())
    AND tenant_id = public.get_user_tenant(auth.uid())  -- Can only create their own
  );
