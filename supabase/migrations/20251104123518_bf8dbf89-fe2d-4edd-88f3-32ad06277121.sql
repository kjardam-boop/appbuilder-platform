-- Sprint A: Extend capabilities table and create app_capability_usage relation

-- Add scope and app_definition_id to capabilities
ALTER TABLE capabilities 
ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'platform',
ADD COLUMN IF NOT EXISTS app_definition_id uuid REFERENCES app_definitions(id) ON DELETE CASCADE;

-- Add check constraint for scope
ALTER TABLE capabilities 
ADD CONSTRAINT capabilities_scope_check 
CHECK (scope IN ('platform', 'app-specific'));

-- Add check constraint: app-specific capabilities must have app_definition_id
ALTER TABLE capabilities 
ADD CONSTRAINT capabilities_app_scope_check 
CHECK (
  (scope = 'platform' AND app_definition_id IS NULL) OR
  (scope = 'app-specific' AND app_definition_id IS NOT NULL)
);

-- Create app_capability_usage relation table
CREATE TABLE IF NOT EXISTS app_capability_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_definition_id uuid NOT NULL REFERENCES app_definitions(id) ON DELETE CASCADE,
  capability_id uuid NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
  is_required boolean NOT NULL DEFAULT true,
  config_schema jsonb DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(app_definition_id, capability_id)
);

-- Enable RLS on app_capability_usage
ALTER TABLE app_capability_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies for app_capability_usage
CREATE POLICY "Authenticated users can view app capability usage"
ON app_capability_usage FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Platform admins can manage app capability usage"
ON app_capability_usage FOR ALL
TO authenticated
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_app_capability_usage_app_id 
ON app_capability_usage(app_definition_id);

CREATE INDEX IF NOT EXISTS idx_app_capability_usage_capability_id 
ON app_capability_usage(capability_id);

CREATE INDEX IF NOT EXISTS idx_capabilities_scope 
ON capabilities(scope);

CREATE INDEX IF NOT EXISTS idx_capabilities_app_definition_id 
ON capabilities(app_definition_id) WHERE app_definition_id IS NOT NULL;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_app_capability_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_app_capability_usage_updated_at
BEFORE UPDATE ON app_capability_usage
FOR EACH ROW
EXECUTE FUNCTION update_app_capability_usage_updated_at();