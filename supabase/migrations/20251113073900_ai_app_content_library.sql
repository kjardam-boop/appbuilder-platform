-- AI App Content Library
-- Stores markdown content templates for AI-generated dynamic experiences

-- Create content library table
CREATE TABLE IF NOT EXISTS public.ai_app_content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT,  -- NULL for platform-wide templates
  category TEXT NOT NULL,  -- "onboarding", "faq", "help", "integration", "product"
  title TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',  -- For AI search matching
  metadata JSONB DEFAULT '{}',  -- Flexible extra data (author, tags, etc)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  CONSTRAINT valid_category CHECK (
    category IN ('onboarding', 'faq', 'help', 'integration', 'product', 'guide', 'tutorial', 'general')
  )
);

-- Create indexes for performance
CREATE INDEX idx_ai_content_tenant ON public.ai_app_content_library(tenant_id);
CREATE INDEX idx_ai_content_category ON public.ai_app_content_library(category);
CREATE INDEX idx_ai_content_keywords ON public.ai_app_content_library USING GIN(keywords);
CREATE INDEX idx_ai_content_active ON public.ai_app_content_library(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.ai_app_content_library ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Platform admins can manage all content
CREATE POLICY "Platform admins can manage all content"
  ON public.ai_app_content_library
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('platform_owner', 'platform_admin', 'platform_support')
      AND user_roles.scope_type = 'platform'
    )
  );

-- Tenant admins can manage their own tenant content
CREATE POLICY "Tenant admins can manage tenant content"
  ON public.ai_app_content_library
  FOR ALL
  TO authenticated
  USING (
    tenant_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('tenant_owner', 'tenant_admin')
      AND user_roles.scope_type = 'tenant'
      AND user_roles.scope_id = ai_app_content_library.tenant_id::uuid
    )
  );

-- All authenticated users can view active content (for AI generation)
CREATE POLICY "Authenticated users can view active content"
  ON public.ai_app_content_library
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_content_updated_at
  BEFORE UPDATE ON public.ai_app_content_library
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_content_updated_at();

-- Add helpful comments
COMMENT ON TABLE public.ai_app_content_library IS 'Markdown content templates for AI-generated dynamic experiences. AI searches this to find relevant content based on user questions.';
COMMENT ON COLUMN public.ai_app_content_library.tenant_id IS 'NULL = platform-wide template, otherwise tenant-specific content';
COMMENT ON COLUMN public.ai_app_content_library.keywords IS 'Array of keywords for AI semantic search and matching';
COMMENT ON COLUMN public.ai_app_content_library.content_markdown IS 'Full markdown content. AI will convert this to ExperienceJSON blocks.';

-- Insert platform-wide seed content examples
INSERT INTO public.ai_app_content_library (
  tenant_id,
  category,
  title,
  content_markdown,
  keywords,
  metadata
) VALUES
(
  NULL,
  'onboarding',
  'Welcome to the Platform',
  E'# Welcome! 👋\n\nWelcome to your new workspace. Here''s what you can do:\n\n## Getting Started\n\n1. **Set up your profile** - Add your details and preferences\n2. **Invite your team** - Collaborate with colleagues\n3. **Connect integrations** - Link your business systems\n\n## Need Help?\n\nOur support team is here to help you succeed!',
  ARRAY['welcome', 'getting started', 'onboarding', 'setup'],
  '{"author": "Platform Team", "version": "1.0"}'::jsonb
),
(
  NULL,
  'faq',
  'How do I connect an integration?',
  E'# Connecting Integrations\n\nIntegrations allow you to connect external business systems to the platform.\n\n## Steps to Connect\n\n1. Navigate to **Settings → Integrations**\n2. Click **Add Integration**\n3. Choose your system from the catalog\n4. Follow the authentication flow\n5. Configure sync settings\n\n## Supported Systems\n\nWe support 50+ business systems including:\n- CRM systems (HubSpot, Salesforce)\n- ERP systems (Tripletex, Visma)\n- Communication tools (Slack, Teams)\n\n## Troubleshooting\n\nIf you encounter issues, check:\n- Your API credentials are correct\n- You have necessary permissions in the external system\n- Network connectivity is working',
  ARRAY['integration', 'connect', 'setup', 'api', 'sync'],
  '{"author": "Integration Team", "difficulty": "beginner"}'::jsonb
),
(
  NULL,
  'help',
  'Understanding Roles and Permissions',
  E'# Roles and Permissions\n\n## Overview\n\nThe platform uses a role-based access control system to manage what users can do.\n\n## Available Roles\n\n### Platform Level\n- **Platform Owner** - Full system access\n- **Platform Admin** - Manage tenants and users\n- **Platform Support** - Read-only support access\n\n### Tenant Level\n- **Tenant Owner** - Full tenant access\n- **Tenant Admin** - Manage tenant settings\n- **Tenant User** - Standard user access\n\n### App Level\n- **App Admin** - Manage specific app\n- **App User** - Use specific app\n\n## Assigning Roles\n\nOnly admins can assign roles. Go to **Users → Select User → Manage Roles**.',
  ARRAY['roles', 'permissions', 'access', 'security', 'users'],
  '{"author": "Security Team", "last_updated": "2024-01"}'::jsonb
);
