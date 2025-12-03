-- Add brreg as direct_api integration
INSERT INTO integration_definitions (key, name, description, type, icon_name, requires_credentials, default_config, is_active)
VALUES 
  ('brreg', 'Brønnøysundregistrene', 'Norsk offentlig register for bedriftsinformasjon', 'direct_api', 'Building2', false,
   '{"base_url": "https://data.brreg.no"}'::jsonb, true)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  icon_name = EXCLUDED.icon_name,
  default_config = EXCLUDED.default_config,
  updated_at = NOW();

