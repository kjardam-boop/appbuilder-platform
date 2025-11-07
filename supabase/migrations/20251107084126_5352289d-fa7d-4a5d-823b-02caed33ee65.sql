-- Create tenant_themes table for storing extracted branding per tenant
CREATE TABLE IF NOT EXISTS public.tenant_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  tokens JSONB NOT NULL,
  extracted_from_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenant_themes ENABLE ROW LEVEL SECURITY;

-- Create unique index: only one active theme per tenant
CREATE UNIQUE INDEX IF NOT EXISTS tenant_themes_one_active_per_tenant
  ON public.tenant_themes(tenant_id) WHERE (is_active = true);

-- Create index for tenant_id + URL lookups
CREATE INDEX IF NOT EXISTS tenant_themes_tenant_url_idx
  ON public.tenant_themes(tenant_id, extracted_from_url);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_tenant_themes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenant_themes_updated_at
  BEFORE UPDATE ON public.tenant_themes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tenant_themes_updated_at();

-- RLS Policies
-- Platform admins can read all themes
CREATE POLICY tenant_themes_platform_read ON public.tenant_themes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('platform_owner', 'platform_support')
        AND user_roles.scope_type = 'platform'
    )
  );

-- Tenant admins can read their themes
CREATE POLICY tenant_themes_admin_read ON public.tenant_themes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.scope_type = 'tenant'
        AND user_roles.scope_id = tenant_themes.tenant_id
    )
  );

-- Tenant admins can insert themes for their tenant
CREATE POLICY tenant_themes_admin_insert ON public.tenant_themes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.scope_type = 'tenant'
        AND user_roles.scope_id = tenant_themes.tenant_id
        AND user_roles.role IN ('tenant_owner', 'tenant_admin')
    )
  );

-- Tenant admins can update their themes
CREATE POLICY tenant_themes_admin_update ON public.tenant_themes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.scope_type = 'tenant'
        AND user_roles.scope_id = tenant_themes.tenant_id
        AND user_roles.role IN ('tenant_owner', 'tenant_admin')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.scope_type = 'tenant'
        AND user_roles.scope_id = tenant_themes.tenant_id
        AND user_roles.role IN ('tenant_owner', 'tenant_admin')
    )
  );