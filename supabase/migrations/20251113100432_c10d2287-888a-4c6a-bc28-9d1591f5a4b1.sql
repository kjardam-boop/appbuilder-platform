-- Create ai_app_content_library table
CREATE TABLE public.ai_app_content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  file_storage_path TEXT,
  file_type TEXT DEFAULT 'markdown',
  file_size_bytes INTEGER,
  original_filename TEXT,
  extracted_text TEXT,
  last_processed_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_file_type CHECK (file_type IN ('markdown', 'pdf', 'docx', 'txt', 'html')),
  CONSTRAINT valid_file_size CHECK (file_size_bytes IS NULL OR file_size_bytes <= 10485760)
);

-- Create indexes
CREATE INDEX idx_ai_content_tenant ON public.ai_app_content_library(tenant_id);
CREATE INDEX idx_ai_content_category ON public.ai_app_content_library(category);
CREATE INDEX idx_ai_content_keywords ON public.ai_app_content_library USING GIN(keywords);
CREATE INDEX idx_ai_content_active ON public.ai_app_content_library(is_active);
CREATE INDEX idx_ai_content_file_path ON public.ai_app_content_library(file_storage_path);
CREATE INDEX idx_ai_content_file_type ON public.ai_app_content_library(file_type);

-- Enable RLS
ALTER TABLE public.ai_app_content_library ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Platform admins can manage all content"
ON public.ai_app_content_library
FOR ALL
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Tenant admins can manage their content"
ON public.ai_app_content_library
FOR ALL
USING (
  tenant_id IS NULL OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND scope_type = 'tenant'
      AND scope_id = ai_app_content_library.tenant_id
      AND role IN ('tenant_owner', 'tenant_admin')
  )
)
WITH CHECK (
  tenant_id IS NULL OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND scope_type = 'tenant'
      AND scope_id = ai_app_content_library.tenant_id
      AND role IN ('tenant_owner', 'tenant_admin')
  )
);

CREATE POLICY "Authenticated users can view active content"
ON public.ai_app_content_library
FOR SELECT
USING (is_active = true);

-- Trigger for updated_at
CREATE TRIGGER update_ai_content_library_updated_at
BEFORE UPDATE ON public.ai_app_content_library
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert seed data
INSERT INTO public.ai_app_content_library (
  tenant_id, 
  category, 
  title, 
  content_markdown, 
  keywords, 
  is_active
) VALUES
(
  NULL,
  'onboarding',
  'Getting Started with the Platform',
  '# Welcome to the Platform

Get started in 3 easy steps:

1. Create your account
2. Connect your systems
3. Start integrating',
  ARRAY['getting started', 'onboarding', 'welcome', 'intro', 'start'],
  true
),
(
  NULL,
  'integration',
  'How to Connect Tripletex',
  '# Tripletex Integration

## Overview
Tripletex is a cloud-based ERP system.

## Steps
1. Get API credentials
2. Add integration in platform
3. Configure data sync',
  ARRAY['tripletex', 'erp', 'integration', 'connect', 'accounting'],
  true
),
(
  NULL,
  'faq',
  'Roles and Permissions',
  '# Understanding Roles

## Available Roles
- **Admin**: Full access
- **User**: Standard access
- **Viewer**: Read-only',
  ARRAY['roles', 'permissions', 'access', 'security', 'admin'],
  true
);