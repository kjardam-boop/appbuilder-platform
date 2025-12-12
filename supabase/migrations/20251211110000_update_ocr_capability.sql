-- Update OCR capability with:
-- 1. Excel/CSV file type support
-- 2. Provider enum including unpdf+gpt and spreadsheet parsers
-- 3. Input/output types for destination matching

UPDATE capabilities 
SET 
  description = 'Automatisk tekstutvinning fra bilder, PDF-dokumenter, Excel og CSV ved hjelp av AI-basert OCR og parsing. Støtter norsk og engelsk tekst.',
  config_schema = '{
    "type": "object",
    "properties": {
      "provider": {
        "type": "string",
        "enum": ["openai_vision", "unpdf+gpt", "xlsx+gpt", "csv+gpt", "azure_di", "google_vision", "tesseract"],
        "default": "openai_vision",
        "title": "OCR-leverandør",
        "description": "Hvilken metode som brukes for tekstutvinning. OpenAI Vision for bilder, unpdf+gpt for PDF-filer, xlsx/csv+gpt for regneark."
      },
      "autoProcess": {
        "type": "boolean",
        "default": true,
        "title": "Auto-prosesser",
        "description": "Prosesser dokumenter automatisk ved opplasting"
      },
      "structureWithGpt": {
        "type": "boolean",
        "default": true,
        "title": "Strukturer med GPT",
        "description": "Bruk GPT til å strukturere og formatere ekstrahert tekst"
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
        "default": true,
        "title": "Destinasjonsruting",
        "description": "Tillat brukere å velge hvor ekstrahert tekst sendes"
      }
    }
  }',
  output_types = ARRAY['text', 'json'],
  input_types = ARRAY['image', 'file'],
  destination_config = '{
    "default_destination": "content_library",
    "available_destinations": ["content_library", "integration", "capability"],
    "auto_store": true
  }',
  tags = ARRAY['ai', 'documents', 'automation', 'ocr', 'productivity', 'excel', 'csv', 'pdf'],
  updated_at = NOW()
WHERE key = 'document-ocr';

-- Update domain tables to include content_library
UPDATE capabilities 
SET domain_tables = ARRAY['content_library']
WHERE key = 'document-ocr';

-- Update backend files
UPDATE capabilities 
SET backend_files = ARRAY[
  'supabase/functions/process-document-ocr/index.ts'
]
WHERE key = 'document-ocr';

-- Update frontend files
UPDATE capabilities 
SET frontend_files = ARRAY[
  'src/modules/core/capabilities/components/testers/OCRCapabilityTester.tsx',
  'src/modules/core/capabilities/components/DestinationSelector.tsx',
  'src/modules/core/capabilities/services/destinationService.ts'
]
WHERE key = 'document-ocr';

-- Update database migrations reference
UPDATE capabilities 
SET database_migrations = ARRAY[
  '20251209150000_add_ocr_columns.sql',
  '20251209160000_seed_ocr_capability.sql',
  '20251211100000_add_capability_io_types.sql',
  '20251211110000_update_ocr_capability.sql'
]
WHERE key = 'document-ocr';

