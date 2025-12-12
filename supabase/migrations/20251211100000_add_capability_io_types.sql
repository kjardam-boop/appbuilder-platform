-- ============================================================================
-- Add Input/Output Types to Capabilities
-- Enables matching between capabilities for data flow/destinations
-- ============================================================================

-- 1. Add output_types column - what the capability produces
ALTER TABLE capabilities 
ADD COLUMN IF NOT EXISTS output_types TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 2. Add input_types column - what the capability accepts
ALTER TABLE capabilities 
ADD COLUMN IF NOT EXISTS input_types TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 3. Add destination_config for capability-specific routing
ALTER TABLE capabilities 
ADD COLUMN IF NOT EXISTS destination_config JSONB DEFAULT '{}'::JSONB;

-- 4. Comments for documentation
COMMENT ON COLUMN capabilities.output_types IS 'Data types this capability produces: text, json, file, image, structured_data';
COMMENT ON COLUMN capabilities.input_types IS 'Data types this capability accepts as input: text, json, file, image, structured_data';
COMMENT ON COLUMN capabilities.destination_config IS 'Default destination configuration for this capability';

-- 5. Update OCR capability with output types
UPDATE capabilities 
SET 
  output_types = ARRAY['text', 'json'],
  input_types = ARRAY['image', 'file'],
  destination_config = '{
    "default_destination": "content_library",
    "available_destinations": ["content_library", "integration", "capability"],
    "auto_store": true
  }'::JSONB
WHERE key = 'document-ocr';

-- 6. Update content-library capability to accept text input
UPDATE capabilities 
SET 
  input_types = ARRAY['text', 'file', 'image', 'json'],
  output_types = ARRAY['file', 'json']
WHERE key = 'content-library';

-- 7. Add index for capability matching
CREATE INDEX IF NOT EXISTS idx_capabilities_output_types 
ON capabilities USING GIN (output_types);

CREATE INDEX IF NOT EXISTS idx_capabilities_input_types 
ON capabilities USING GIN (input_types);

-- 8. Create capability_destinations table for explicit routing
CREATE TABLE IF NOT EXISTS capability_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_capability_id UUID NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
  destination_type TEXT NOT NULL CHECK (destination_type IN ('capability', 'integration', 'webhook')),
  destination_id UUID, -- capability_id or integration_definition_id
  destination_url TEXT, -- For custom webhooks
  config JSONB DEFAULT '{}',
  priority INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_capability_destination UNIQUE (source_capability_id, destination_type, destination_id)
);

-- 9. RLS for capability_destinations
ALTER TABLE capability_destinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage capability destinations" ON capability_destinations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('platform_owner', 'platform_admin')
    )
  );

-- 10. Comments
COMMENT ON TABLE capability_destinations IS 'Defines where capability output can be routed';
COMMENT ON COLUMN capability_destinations.source_capability_id IS 'The capability that produces output';
COMMENT ON COLUMN capability_destinations.destination_type IS 'Type of destination: capability, integration, or webhook';
COMMENT ON COLUMN capability_destinations.destination_id IS 'ID of target capability or integration_definition';
COMMENT ON COLUMN capability_destinations.destination_url IS 'URL for custom webhook destinations';
COMMENT ON COLUMN capability_destinations.config IS 'Transformation or routing configuration';
COMMENT ON COLUMN capability_destinations.priority IS 'Order of execution for multiple destinations';

