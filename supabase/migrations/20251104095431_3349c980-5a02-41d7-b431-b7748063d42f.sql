-- ============================================
-- Platform Apps Infrastructure Migration
-- ============================================
-- This migration creates the Platform Apps infrastructure:
-- 1. Renames existing 'applications' to 'tenant_generated_apps' (customer-specific apps)
-- 2. Creates 'app_definitions' (platform app catalog)
-- 3. Creates 'app_versions' (versioning for platform apps)
-- 4. Creates new 'applications' table (tenant installations of platform apps)

-- Step 1: Rename existing applications table to tenant_generated_apps
ALTER TABLE IF EXISTS applications RENAME TO tenant_generated_apps;

-- Step 2: Create app_definitions (Platform Apps catalog)
CREATE TABLE IF NOT EXISTS app_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon_name TEXT NOT NULL DEFAULT 'Briefcase',
  app_type TEXT NOT NULL CHECK (app_type IN ('core', 'addon', 'custom')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Schema & Structure
  domain_tables TEXT[] NOT NULL DEFAULT '{}',
  shared_tables TEXT[] DEFAULT '{}',
  routes TEXT[] DEFAULT '{}',
  modules TEXT[] DEFAULT '{}',
  extension_points JSONB DEFAULT '{}',
  
  -- Metadata arrays stored as top-level columns
  hooks JSONB DEFAULT '[]',
  ui_components JSONB DEFAULT '[]',
  capabilities TEXT[] DEFAULT '{}',
  integration_requirements JSONB DEFAULT '{}',
  
  schema_version TEXT NOT NULL DEFAULT '1.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 3: Create app_versions (versioning for platform apps)
CREATE TABLE IF NOT EXISTS app_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_definition_id UUID NOT NULL REFERENCES app_definitions(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  changelog TEXT,
  migrations JSONB DEFAULT '[]',
  breaking_changes BOOLEAN DEFAULT false,
  manifest_url TEXT,
  released_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deprecated_at TIMESTAMPTZ,
  end_of_life_at TIMESTAMPTZ,
  UNIQUE(app_definition_id, version)
);

-- Step 4: Create new applications table (tenant installations)
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  app_definition_id UUID NOT NULL REFERENCES app_definitions(id) ON DELETE RESTRICT,
  
  -- Installation details
  installed_version TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'stable' CHECK (channel IN ('stable', 'canary', 'pinned')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'installing', 'updating', 'failed', 'disabled')),
  
  -- Configuration & Overrides
  config JSONB DEFAULT '{}',
  overrides JSONB DEFAULT '{}',
  
  -- Migration tracking
  last_migration_version TEXT,
  last_migration_at TIMESTAMPTZ,
  migration_status TEXT CHECK (migration_status IN ('pending', 'in_progress', 'completed', 'failed')),
  
  -- Timestamps
  installed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_updated_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(tenant_id, app_definition_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_app_definitions_key ON app_definitions(key);
CREATE INDEX IF NOT EXISTS idx_app_definitions_type ON app_definitions(app_type);
CREATE INDEX IF NOT EXISTS idx_app_versions_app_id ON app_versions(app_definition_id);
CREATE INDEX IF NOT EXISTS idx_applications_tenant ON applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_applications_definition ON applications(app_definition_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- Enable RLS on new tables
ALTER TABLE app_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for app_definitions (public read, platform admin write)
CREATE POLICY "Anyone can view active app definitions"
  ON app_definitions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Platform admins can manage app definitions"
  ON app_definitions FOR ALL
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

-- RLS Policies for app_versions (public read, platform admin write)
CREATE POLICY "Anyone can view app versions"
  ON app_versions FOR SELECT
  USING (true);

CREATE POLICY "Platform admins can manage app versions"
  ON app_versions FOR ALL
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

-- RLS Policies for applications (tenant isolation)
CREATE POLICY "Tenant members can view their applications"
  ON applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.scope_type = 'tenant'
        AND user_roles.scope_id = applications.tenant_id
    )
  );

CREATE POLICY "Tenant admins can manage applications"
  ON applications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.scope_type = 'tenant'
        AND user_roles.scope_id = applications.tenant_id
        AND user_roles.role IN ('tenant_owner', 'tenant_admin')
    )
  );

-- Update trigger for app_definitions
CREATE OR REPLACE FUNCTION update_app_definitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_app_definitions_timestamp
  BEFORE UPDATE ON app_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_app_definitions_updated_at();

-- Update trigger for applications
CREATE OR REPLACE FUNCTION update_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_applications_timestamp
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_applications_updated_at();