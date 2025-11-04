-- Create table for role definitions with scope mapping
CREATE TABLE role_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL UNIQUE,
  scope_type role_scope NOT NULL,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE role_definitions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view active role definitions"
ON role_definitions FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Platform admins can manage role definitions"
ON role_definitions FOR ALL
TO authenticated
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_role_definitions_updated_at
  BEFORE UPDATE ON role_definitions
  FOR EACH ROW EXECUTE FUNCTION update_compliance_updated_at();

-- Seed role definitions
INSERT INTO role_definitions (role, scope_type, name, description, sort_order) VALUES
  -- Platform roles
  ('platform_owner', 'platform', 'Platform Owner', 'Full platform tilgang', 1),
  ('platform_support', 'platform', 'Platform Support', 'Support og feilsøking', 2),
  
  -- Tenant roles  
  ('tenant_owner', 'tenant', 'Tenant Owner', 'Eier av tenant', 10),
  ('tenant_admin', 'tenant', 'Tenant Admin', 'Administrator i tenant', 11),
  ('security_admin', 'tenant', 'Security Admin', 'Sikkerhet og tilgangsstyring', 12),
  
  -- Company roles
  
  -- Project roles
  ('project_owner', 'project', 'Project Owner', 'Prosjekteier', 30),
  ('analyst', 'project', 'Analyst', 'Analytiker', 31),
  ('contributor', 'project', 'Contributor', 'Bidragsyter', 32),
  ('viewer', 'project', 'Viewer', 'Leser', 33),
  
  -- App roles
  ('app_admin', 'app', 'App Admin', 'App administrator', 40),
  ('app_user', 'app', 'App User', 'App bruker', 41)
ON CONFLICT (role) DO NOTHING;