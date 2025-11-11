-- Fase 1.1: Legg til company_id i external_system_vendors
ALTER TABLE external_system_vendors 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_external_system_vendors_company 
ON external_system_vendors(company_id) WHERE company_id IS NOT NULL;

-- Fase 1.2: Sikre kobling mellom external_systems og integration_definitions
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_integration_external_system'
  ) THEN
    ALTER TABLE integration_definitions
    ADD CONSTRAINT fk_integration_external_system
    FOREIGN KEY (external_system_id) REFERENCES external_systems(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Fase 1.3: Drop og recreate external_system_integrations med ny struktur
DROP TABLE IF EXISTS external_system_integrations CASCADE;

CREATE TABLE external_system_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_system_id UUID NOT NULL REFERENCES external_systems(id) ON DELETE CASCADE,
  integration_definition_id UUID REFERENCES integration_definitions(id) ON DELETE SET NULL,
  integration_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  documentation_url TEXT,
  is_official BOOLEAN DEFAULT false,
  implementation_status TEXT DEFAULT 'available',
  auth_methods JSONB DEFAULT '[]'::jsonb,
  features JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_external_system_integrations_system 
ON external_system_integrations(external_system_id);

CREATE INDEX idx_external_system_integrations_status 
ON external_system_integrations(implementation_status);

CREATE INDEX idx_external_system_integrations_type 
ON external_system_integrations(integration_type);

-- Enable RLS
ALTER TABLE external_system_integrations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view integrations"
ON external_system_integrations
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Platform admins can manage integrations"
ON external_system_integrations
FOR ALL
TO authenticated
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));

-- Trigger
CREATE OR REPLACE FUNCTION update_external_system_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_external_system_integrations_updated_at
BEFORE UPDATE ON external_system_integrations
FOR EACH ROW
EXECUTE FUNCTION update_external_system_integrations_updated_at();