-- Seed OCR capability into the capabilities table
-- This makes OCR available as a selectable capability for customer apps

INSERT INTO capabilities (
  key,
  name,
  description,
  category,
  icon_name,
  is_active,
  is_core,
  visibility,
  scope,
  config_schema,
  tags,
  created_at
) VALUES (
  'document-ocr',
  'Dokumentskanning (OCR)',
  'Automatisk tekstutvinning fra bilder og PDF-dokumenter ved hjelp av AI-basert OCR. Støtter norsk og engelsk tekst.',
  'productivity',
  'Scan',
  true,
  false, -- Not a core capability, must be explicitly enabled
  'public', -- Available to all tenants
  'platform', -- Platform-wide capability (valid values: 'platform' or 'app-specific')
  '{
    "type": "object",
    "properties": {
      "provider": {
        "type": "string",
        "enum": ["openai_vision", "azure_di", "google_vision", "tesseract"],
        "default": "openai_vision",
        "title": "OCR-leverandør",
        "description": "Hvilken AI-tjeneste som brukes for tekstutvinning"
      },
      "autoProcess": {
        "type": "boolean",
        "default": true,
        "title": "Auto-prosesser",
        "description": "Prosesser dokumenter automatisk ved opplasting"
      },
      "supportedLanguages": {
        "type": "array",
        "items": { "type": "string" },
        "default": ["no", "en"],
        "title": "Støttede språk",
        "description": "ISO 639-1 språkkoder"
      },
      "maxFileSizeMB": {
        "type": "number",
        "default": 10,
        "minimum": 1,
        "maximum": 50,
        "title": "Maks filstørrelse (MB)"
      },
      "enableDestinationRouting": {
        "type": "boolean",
        "default": false,
        "title": "Destinasjonsruting",
        "description": "Tillat brukere å velge hvor ekstrahert tekst sendes"
      }
    }
  }',
  ARRAY['ai', 'documents', 'automation', 'ocr', 'productivity'],
  NOW()
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon_name = EXCLUDED.icon_name,
  is_active = EXCLUDED.is_active,
  visibility = EXCLUDED.visibility,
  is_core = EXCLUDED.is_core,
  config_schema = EXCLUDED.config_schema,
  tags = EXCLUDED.tags,
  updated_at = NOW();

-- Add comment
COMMENT ON TABLE capabilities IS 'Capability registry including document-ocr for AI-powered text extraction';

