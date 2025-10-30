-- Create permission management tables for role-based access control

-- Table for defining available resources in the system
CREATE TABLE permission_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table for defining available actions that can be performed
CREATE TABLE permission_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Main table for role permissions (which role has which permission)
CREATE TABLE role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  resource_key text NOT NULL,
  action_key text NOT NULL,
  allowed boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(role, resource_key, action_key)
);

-- Enable RLS on all tables
ALTER TABLE permission_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for permission_resources
CREATE POLICY "Platform admins manage resources"
ON permission_resources FOR ALL
TO authenticated
USING (public.admin_has_platform_role(auth.uid()))
WITH CHECK (public.admin_has_platform_role(auth.uid()));

CREATE POLICY "Authenticated users view resources"
ON permission_resources FOR SELECT
TO authenticated
USING (is_active = true);

-- RLS Policies for permission_actions
CREATE POLICY "Platform admins manage actions"
ON permission_actions FOR ALL
TO authenticated
USING (public.admin_has_platform_role(auth.uid()))
WITH CHECK (public.admin_has_platform_role(auth.uid()));

CREATE POLICY "Authenticated users view actions"
ON permission_actions FOR SELECT
TO authenticated
USING (is_active = true);

-- RLS Policies for role_permissions
CREATE POLICY "Platform admins manage permissions"
ON role_permissions FOR ALL
TO authenticated
USING (public.admin_has_platform_role(auth.uid()))
WITH CHECK (public.admin_has_platform_role(auth.uid()));

CREATE POLICY "Authenticated users view permissions"
ON role_permissions FOR SELECT
TO authenticated
USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_permission_resources_updated_at
  BEFORE UPDATE ON permission_resources
  FOR EACH ROW EXECUTE FUNCTION update_compliance_updated_at();

CREATE TRIGGER update_permission_actions_updated_at
  BEFORE UPDATE ON permission_actions
  FOR EACH ROW EXECUTE FUNCTION update_compliance_updated_at();

CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON role_permissions
  FOR EACH ROW EXECUTE FUNCTION update_compliance_updated_at();

-- Seed initial resource data
INSERT INTO permission_resources (key, name, description) VALUES
  ('company', 'Selskap', 'Bedriftsinformasjon og metadata'),
  ('project', 'Prosjekt', 'Prosjektstyring og milepæler'),
  ('document', 'Dokument', 'Filer og dokumenter'),
  ('tasks', 'Oppgaver', 'Oppgaver og sjekklister'),
  ('opportunity', 'Muligheter', 'Salgsmuligheter og pipeline'),
  ('supplier', 'Leverandør', 'Leverandørevaluering og scoring'),
  ('integration', 'Integrasjon', 'API-integrasjoner og webhooks'),
  ('user', 'Bruker', 'Brukerprofiler og innstillinger'),
  ('tenant', 'Tenant', 'Tenant-administrasjon'),
  ('application', 'Applikasjon', 'Applikasjonsprodukter og leverandører');

-- Seed initial action data
INSERT INTO permission_actions (key, name, description) VALUES
  ('create', 'Opprett', 'Opprette nye ressurser'),
  ('read', 'Les', 'Lese og vise ressurser'),
  ('update', 'Oppdater', 'Endre eksisterende ressurser'),
  ('delete', 'Slett', 'Slette ressurser'),
  ('list', 'List', 'Liste og søke i ressurser'),
  ('admin', 'Administrer', 'Full administratortilgang');