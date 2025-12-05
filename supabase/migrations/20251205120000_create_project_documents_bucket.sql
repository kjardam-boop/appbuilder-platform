-- Create storage bucket for project documents
-- Used by ProjectDocumentUpload component for wizard document uploads

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-documents',
  'project-documents',
  false,  -- Private bucket
  10485760,  -- 10MB max file size
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-powerpoint', 'text/plain', 'text/markdown']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS Policies for the bucket
-- Note: user_roles uses scope_type/scope_id pattern, not tenant_id directly

-- Allow authenticated users to upload files to projects they have access to
CREATE POLICY "Users can upload project documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT cap.id::text 
    FROM customer_app_projects cap
    WHERE EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid()
      AND (
        -- Platform-level access
        (ur.scope_type = 'platform')
        -- Tenant-level access where project belongs to same tenant
        OR (ur.scope_type = 'tenant' AND ur.scope_id = cap.tenant_id)
        -- Direct project access
        OR (ur.scope_type = 'project' AND ur.scope_id = cap.id)
      )
    )
  )
);

-- Allow users to read files from projects they have access to
CREATE POLICY "Users can read project documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT cap.id::text 
    FROM customer_app_projects cap
    WHERE EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.scope_type = 'platform')
        OR (ur.scope_type = 'tenant' AND ur.scope_id = cap.tenant_id)
        OR (ur.scope_type = 'project' AND ur.scope_id = cap.id)
      )
    )
  )
);

-- Allow users to delete files from projects they have access to
CREATE POLICY "Users can delete project documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT cap.id::text 
    FROM customer_app_projects cap
    WHERE EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.scope_type = 'platform')
        OR (ur.scope_type = 'tenant' AND ur.scope_id = cap.tenant_id)
        OR (ur.scope_type = 'project' AND ur.scope_id = cap.id)
      )
    )
  )
);

-- Platform admins can manage all files
CREATE POLICY "Platform admins can manage all project documents"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'project-documents'
  AND is_platform_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'project-documents'
  AND is_platform_admin(auth.uid())
);
