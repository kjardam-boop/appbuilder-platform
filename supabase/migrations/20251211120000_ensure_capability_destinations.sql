-- ============================================================================
-- Ensure capability_destinations table exists
-- This migration verifies and creates the table if it doesn't exist
-- ============================================================================

-- Check if table exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'capability_destinations'
  ) THEN
    -- Create capability_destinations table
    CREATE TABLE capability_destinations (
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

    -- Enable RLS
    ALTER TABLE capability_destinations ENABLE ROW LEVEL SECURITY;

    -- Create RLS policy
    CREATE POLICY "Platform admins can manage capability destinations" ON capability_destinations
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role IN ('platform_owner', 'platform_admin')
        )
      );

    -- Add comments
    COMMENT ON TABLE capability_destinations IS 'Defines where capability output can be routed';
    COMMENT ON COLUMN capability_destinations.source_capability_id IS 'The capability that produces output';
    COMMENT ON COLUMN capability_destinations.destination_type IS 'Type of destination: capability, integration, or webhook';
    COMMENT ON COLUMN capability_destinations.destination_id IS 'ID of target capability or integration_definition';
    COMMENT ON COLUMN capability_destinations.destination_url IS 'URL for custom webhook destinations';
    COMMENT ON COLUMN capability_destinations.config IS 'Transformation or routing configuration';
    COMMENT ON COLUMN capability_destinations.priority IS 'Order of execution for multiple destinations';

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_capability_destinations_source 
      ON capability_destinations(source_capability_id);
    CREATE INDEX IF NOT EXISTS idx_capability_destinations_destination 
      ON capability_destinations(destination_type, destination_id);
  END IF;
END $$;

-- Also ensure output_types, input_types, and destination_config columns exist on capabilities
DO $$
BEGIN
  -- Add output_types if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'capabilities' 
    AND column_name = 'output_types'
  ) THEN
    ALTER TABLE capabilities 
    ADD COLUMN output_types TEXT[] DEFAULT ARRAY[]::TEXT[];
    COMMENT ON COLUMN capabilities.output_types IS 'Data types this capability produces: text, json, file, image, structured_data';
  END IF;

  -- Add input_types if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'capabilities' 
    AND column_name = 'input_types'
  ) THEN
    ALTER TABLE capabilities 
    ADD COLUMN input_types TEXT[] DEFAULT ARRAY[]::TEXT[];
    COMMENT ON COLUMN capabilities.input_types IS 'Data types this capability accepts as input: text, json, file, image, structured_data';
  END IF;

  -- Add destination_config if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'capabilities' 
    AND column_name = 'destination_config'
  ) THEN
    ALTER TABLE capabilities 
    ADD COLUMN destination_config JSONB DEFAULT '{}'::JSONB;
    COMMENT ON COLUMN capabilities.destination_config IS 'Default destination configuration for this capability';
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_capabilities_output_types 
  ON capabilities USING GIN (output_types);

CREATE INDEX IF NOT EXISTS idx_capabilities_input_types 
  ON capabilities USING GIN (input_types);

