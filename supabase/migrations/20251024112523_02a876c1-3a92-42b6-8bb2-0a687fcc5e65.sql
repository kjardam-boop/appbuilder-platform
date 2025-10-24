-- Create tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  domain TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  plan TEXT NOT NULL DEFAULT 'free',
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Platform admins can manage all tenants
CREATE POLICY "Platform admins can manage all tenants"
  ON public.tenants
  FOR ALL
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- Tenant users can view their own tenant
CREATE POLICY "Tenant users can view own tenant"
  ON public.tenants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_users
      WHERE tenant_users.tenant_id = tenants.id
        AND tenant_users.user_id = auth.uid()
        AND tenant_users.is_active = true
    )
  );

-- Add index for performance
CREATE INDEX idx_tenants_slug ON public.tenants(slug);
CREATE INDEX idx_tenants_domain ON public.tenants(domain);

-- Insert default tenant
INSERT INTO public.tenants (name, slug, domain, status, plan)
VALUES ('Default Platform', 'default', NULL, 'active', 'enterprise')
ON CONFLICT (slug) DO NOTHING;

-- Get the default tenant ID and display it
DO $$
DECLARE
  default_tenant_id UUID;
BEGIN
  SELECT id INTO default_tenant_id FROM public.tenants WHERE slug = 'default';
  RAISE NOTICE 'Default Tenant ID: %', default_tenant_id;
END $$;