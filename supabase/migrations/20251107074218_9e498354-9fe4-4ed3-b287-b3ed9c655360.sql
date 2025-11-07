-- Create Akselera tenant manually
INSERT INTO tenants (id, name, slug, status, plan, settings, is_platform_tenant)
VALUES (
  'fec8748b-5be7-48aa-9ce6-4425cec09b0d'::uuid,
  'AKSELERA NORWAY AS',
  'akselera',
  'active',
  'free',
  '{"company_id": "fec8748b-5be7-48aa-9ce6-4425cec09b0d", "onboarding_completed": false}'::jsonb,
  false
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  status = EXCLUDED.status;

-- Insert default theme for Akselera
INSERT INTO tenant_themes (tenant_id, theme_key, tokens, extracted_from_url, is_active)
VALUES (
  'fec8748b-5be7-48aa-9ce6-4425cec09b0d'::uuid,
  'default',
  '{"primary":"#0EA5E9","accent":"#22C55E","surface":"#0B1220","textOnSurface":"#E5E7EB","fontStack":"ui-sans-serif, system-ui, sans-serif","logoUrl":"https://www.akselera.com/logo.png"}'::jsonb,
  'https://www.akselera.com',
  true
)
ON CONFLICT (tenant_id, theme_key) DO UPDATE SET
  tokens = EXCLUDED.tokens,
  extracted_from_url = EXCLUDED.extracted_from_url;

-- Insert AI integration for Akselera (Lovable AI)
INSERT INTO tenant_integrations (tenant_id, adapter_id, config, is_active)
VALUES (
  'fec8748b-5be7-48aa-9ce6-4425cec09b0d'::uuid,
  'ai-lovable',
  '{"model":"google/gemini-2.5-flash"}'::jsonb,
  true
)
ON CONFLICT (tenant_id, adapter_id) DO UPDATE SET
  config = EXCLUDED.config,
  is_active = EXCLUDED.is_active;