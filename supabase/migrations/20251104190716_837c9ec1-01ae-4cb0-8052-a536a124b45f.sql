-- ============================================================================
-- Phase 4: Advanced Features - MCP Product Mapping & Integration Patterns
-- ============================================================================

-- Step 1: Create app_product_mcp_actions mapping table
CREATE TABLE IF NOT EXISTS public.app_product_mcp_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_product_id uuid NOT NULL REFERENCES public.app_products(id) ON DELETE CASCADE,
  mcp_action_key text NOT NULL, -- e.g., "hubspot.contacts.create"
  resource_type text NOT NULL, -- e.g., "contact", "deal", "invoice"
  operation text NOT NULL CHECK (operation IN ('create', 'read', 'update', 'delete', 'list', 'search')),
  requires_auth boolean DEFAULT true,
  required_scopes text[] DEFAULT '{}',
  documentation_url text,
  example_payload jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(app_product_id, mcp_action_key)
);

CREATE INDEX IF NOT EXISTS idx_app_product_mcp_actions_product ON public.app_product_mcp_actions(app_product_id);
CREATE INDEX IF NOT EXISTS idx_app_product_mcp_actions_key ON public.app_product_mcp_actions(mcp_action_key);
CREATE INDEX IF NOT EXISTS idx_app_product_mcp_actions_resource ON public.app_product_mcp_actions(resource_type, operation);

-- Step 2: Create app_integration_patterns for common use cases
CREATE TABLE IF NOT EXISTS public.app_integration_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES public.app_categories(id) ON DELETE SET NULL,
  source_product_id uuid REFERENCES public.app_products(id) ON DELETE CASCADE,
  target_product_id uuid REFERENCES public.app_products(id) ON DELETE CASCADE,
  pattern_type text NOT NULL CHECK (pattern_type IN ('sync', 'webhook', 'import', 'export', 'bidirectional')),
  trigger_event text, -- e.g., "contact.created", "deal.updated"
  workflow_template jsonb, -- n8n workflow JSON template
  required_capabilities text[] DEFAULT '{}',
  difficulty_level text DEFAULT 'intermediate' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  estimated_setup_minutes integer,
  documentation_url text,
  is_featured boolean DEFAULT false,
  usage_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_integration_patterns_source ON public.app_integration_patterns(source_product_id);
CREATE INDEX IF NOT EXISTS idx_app_integration_patterns_target ON public.app_integration_patterns(target_product_id);
CREATE INDEX IF NOT EXISTS idx_app_integration_patterns_category ON public.app_integration_patterns(category_id);
CREATE INDEX IF NOT EXISTS idx_app_integration_patterns_featured ON public.app_integration_patterns(is_featured) WHERE is_featured = true;

-- Step 3: Enhance partner_certifications with more metadata
ALTER TABLE public.partner_certifications
ADD COLUMN IF NOT EXISTS certification_url text,
ADD COLUMN IF NOT EXISTS expires_at timestamptz,
ADD COLUMN IF NOT EXISTS verified_by uuid,
ADD COLUMN IF NOT EXISTS verified_at timestamptz,
ADD COLUMN IF NOT EXISTS badge_url text,
ADD COLUMN IF NOT EXISTS competency_level text CHECK (competency_level IN ('certified', 'advanced', 'expert', 'elite'));

CREATE INDEX IF NOT EXISTS idx_partner_certifications_expires ON public.partner_certifications(expires_at) WHERE expires_at IS NOT NULL;

-- Step 4: Create vendor_partnerships table for strategic alliances
CREATE TABLE IF NOT EXISTS public.vendor_partnerships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.app_vendors(id) ON DELETE CASCADE,
  partner_vendor_id uuid NOT NULL REFERENCES public.app_vendors(id) ON DELETE CASCADE,
  partnership_type text NOT NULL CHECK (partnership_type IN ('technology', 'reseller', 'integration', 'strategic')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'pending', 'expired', 'terminated')),
  description text,
  contact_email text,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(vendor_id, partner_vendor_id)
);

CREATE INDEX IF NOT EXISTS idx_vendor_partnerships_vendor ON public.vendor_partnerships(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_partnerships_partner ON public.vendor_partnerships(partner_vendor_id);

-- Step 5: Enable RLS on new tables
ALTER TABLE public.app_product_mcp_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_integration_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_partnerships ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
CREATE POLICY "Anyone can view active MCP actions"
  ON public.app_product_mcp_actions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Platform admins can manage MCP actions"
  ON public.app_product_mcp_actions FOR ALL
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Anyone can view integration patterns"
  ON public.app_integration_patterns FOR SELECT
  USING (true);

CREATE POLICY "Platform admins can manage integration patterns"
  ON public.app_integration_patterns FOR ALL
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Anyone can view vendor partnerships"
  ON public.vendor_partnerships FOR SELECT
  USING (status = 'active');

CREATE POLICY "Platform admins can manage vendor partnerships"
  ON public.vendor_partnerships FOR ALL
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- Step 7: Create triggers for updated_at
CREATE TRIGGER update_app_product_mcp_actions_updated_at
  BEFORE UPDATE ON public.app_product_mcp_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_applications_updated_at();

CREATE TRIGGER update_app_integration_patterns_updated_at
  BEFORE UPDATE ON public.app_integration_patterns
  FOR EACH ROW EXECUTE FUNCTION public.update_applications_updated_at();

CREATE TRIGGER update_vendor_partnerships_updated_at
  BEFORE UPDATE ON public.vendor_partnerships
  FOR EACH ROW EXECUTE FUNCTION public.update_applications_updated_at();

-- Step 8: Seed example MCP actions for HubSpot
INSERT INTO public.app_product_mcp_actions (app_product_id, mcp_action_key, resource_type, operation, required_scopes, documentation_url) 
SELECT id, 'hubspot.contacts.create', 'contact', 'create', ARRAY['crm.objects.contacts.write'], 'https://developers.hubspot.com/docs/api/crm/contacts'
FROM public.app_products WHERE slug = 'hubspot-crm'
ON CONFLICT (app_product_id, mcp_action_key) DO NOTHING;

INSERT INTO public.app_product_mcp_actions (app_product_id, mcp_action_key, resource_type, operation, required_scopes, documentation_url) 
SELECT id, 'hubspot.contacts.list', 'contact', 'list', ARRAY['crm.objects.contacts.read'], 'https://developers.hubspot.com/docs/api/crm/contacts'
FROM public.app_products WHERE slug = 'hubspot-crm'
ON CONFLICT (app_product_id, mcp_action_key) DO NOTHING;

INSERT INTO public.app_product_mcp_actions (app_product_id, mcp_action_key, resource_type, operation, required_scopes, documentation_url) 
SELECT id, 'hubspot.deals.create', 'deal', 'create', ARRAY['crm.objects.deals.write'], 'https://developers.hubspot.com/docs/api/crm/deals'
FROM public.app_products WHERE slug = 'hubspot-crm'
ON CONFLICT (app_product_id, mcp_action_key) DO NOTHING;

-- Step 9: Seed example integration patterns
INSERT INTO public.app_integration_patterns (key, name, description, pattern_type, trigger_event, difficulty_level, estimated_setup_minutes)
SELECT 
  'crm-to-email-sync',
  'CRM to Email Contact Sync',
  'Automatically sync new CRM contacts to email marketing platform',
  'sync',
  'contact.created',
  'beginner',
  15
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.app_integration_patterns (key, name, description, pattern_type, trigger_event, difficulty_level, estimated_setup_minutes, is_featured)
SELECT 
  'erp-invoice-webhook',
  'ERP Invoice to Accounting Webhook',
  'Real-time invoice synchronization from ERP to accounting system',
  'webhook',
  'invoice.created',
  'intermediate',
  30,
  true
ON CONFLICT (key) DO NOTHING;

-- Step 10: Add comments
COMMENT ON TABLE public.app_product_mcp_actions IS 'Maps MCP actions to specific product capabilities';
COMMENT ON TABLE public.app_integration_patterns IS 'Pre-built integration templates and use cases';
COMMENT ON TABLE public.vendor_partnerships IS 'Strategic partnerships between vendors';
COMMENT ON COLUMN public.app_product_mcp_actions.mcp_action_key IS 'Fully qualified MCP action identifier';
COMMENT ON COLUMN public.app_integration_patterns.workflow_template IS 'n8n workflow JSON template for quick setup';