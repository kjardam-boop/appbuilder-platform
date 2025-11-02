-- Capability Catalog Tables
-- Reusable platform features and services

-- Capabilities: Core catalog of reusable functions
CREATE TABLE IF NOT EXISTS capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  
  -- Versioning
  current_version TEXT NOT NULL DEFAULT '1.0.0',
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  estimated_dev_hours INTEGER,
  price_per_month NUMERIC(10,2),
  dependencies TEXT[] DEFAULT '{}',
  
  -- Demo
  demo_url TEXT,
  documentation_url TEXT,
  icon_name TEXT,
  
  -- Tags
  tags TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Capability Versions: Version history
CREATE TABLE IF NOT EXISTS capability_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capability_id UUID REFERENCES capabilities(id) ON DELETE CASCADE NOT NULL,
  version TEXT NOT NULL,
  
  -- Changes
  changelog TEXT,
  breaking_changes BOOLEAN DEFAULT false,
  
  -- Implementation
  code_reference TEXT,
  edge_functions TEXT[] DEFAULT '{}',
  database_migrations TEXT[] DEFAULT '{}',
  
  released_at TIMESTAMPTZ DEFAULT NOW(),
  deprecated_at TIMESTAMPTZ,
  end_of_life_at TIMESTAMPTZ,
  
  UNIQUE(capability_id, version)
);

-- Tenant Capabilities: Which capabilities each tenant uses
CREATE TABLE IF NOT EXISTS tenant_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  capability_id UUID REFERENCES capabilities(id) ON DELETE CASCADE NOT NULL,
  
  -- Version management
  version_locked TEXT,
  auto_update BOOLEAN DEFAULT true,
  version_locked_until TIMESTAMPTZ,
  
  -- Configuration
  is_enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  
  -- Audit
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  activated_by UUID REFERENCES auth.users(id),
  last_used_at TIMESTAMPTZ,
  
  UNIQUE(tenant_id, capability_id)
);

-- Customer App Projects: App generation tracking
CREATE TABLE IF NOT EXISTS customer_app_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  subdomain TEXT UNIQUE,
  
  -- Status
  status TEXT DEFAULT 'planning',
  
  -- Selected capabilities
  selected_capabilities JSONB DEFAULT '[]',
  
  -- Estimates
  estimated_hours INTEGER,
  estimated_cost NUMERIC(10,2),
  
  -- Workflow
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  deployed_to_preview_at TIMESTAMPTZ,
  deployed_to_production_at TIMESTAMPTZ,
  
  -- Branding
  branding JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE capability_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_app_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for capabilities
CREATE POLICY "Authenticated users can view capabilities"
  ON capabilities FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Platform admins can manage capabilities"
  ON capabilities FOR ALL
  TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

-- RLS Policies for capability_versions
CREATE POLICY "Authenticated users can view versions"
  ON capability_versions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Platform admins can manage versions"
  ON capability_versions FOR ALL
  TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

-- RLS Policies for tenant_capabilities
CREATE POLICY "Users can view own tenant capabilities"
  ON tenant_capabilities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Tenant admins can manage tenant capabilities"
  ON tenant_capabilities FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for customer_app_projects
CREATE POLICY "Users can view own projects"
  ON customer_app_projects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Tenant users can manage projects"
  ON customer_app_projects FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_capabilities_category ON capabilities(category) WHERE is_active = true;
CREATE INDEX idx_capabilities_tags ON capabilities USING GIN(tags);
CREATE INDEX idx_capability_versions_capability ON capability_versions(capability_id);
CREATE INDEX idx_tenant_capabilities_tenant ON tenant_capabilities(tenant_id) WHERE is_enabled = true;
CREATE INDEX idx_tenant_capabilities_capability ON tenant_capabilities(capability_id);
CREATE INDEX idx_customer_app_projects_tenant ON customer_app_projects(tenant_id);
CREATE INDEX idx_customer_app_projects_status ON customer_app_projects(status);