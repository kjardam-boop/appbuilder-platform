-- Add OCR processing columns to content_library
-- Enables automatic text extraction from PDF/image documents

-- OCR status tracking
ALTER TABLE content_library
ADD COLUMN IF NOT EXISTS ocr_status TEXT DEFAULT 'pending'
  CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed', 'skipped'));

-- OCR confidence score (0.00 - 1.00)
ALTER TABLE content_library
ADD COLUMN IF NOT EXISTS ocr_confidence DECIMAL(3,2);

-- OCR error message if failed
ALTER TABLE content_library
ADD COLUMN IF NOT EXISTS ocr_error TEXT;

-- OCR provider used (for multi-provider support)
ALTER TABLE content_library
ADD COLUMN IF NOT EXISTS ocr_provider TEXT;
-- Values: 'openai_vision', 'azure_di', 'tesseract', 'google_vision'

-- Timestamp when OCR was last processed
ALTER TABLE content_library
ADD COLUMN IF NOT EXISTS ocr_processed_at TIMESTAMPTZ;

-- Destination config for where to send extracted data (JSON)
ALTER TABLE content_library
ADD COLUMN IF NOT EXISTS destination_config JSONB;
-- Example: {"type": "n8n", "workflow_key": "invoice-processing", "mapping": {...}}

-- Index for OCR processing queue
CREATE INDEX IF NOT EXISTS idx_content_ocr_pending 
ON content_library(ocr_status, created_at) 
WHERE ocr_status = 'pending' AND file_type IN ('pdf', 'image', 'jpeg', 'jpg', 'png');

-- Index for OCR provider analytics
CREATE INDEX IF NOT EXISTS idx_content_ocr_provider 
ON content_library(ocr_provider, ocr_status) 
WHERE ocr_provider IS NOT NULL;

-- Function to auto-set OCR status based on file type
CREATE OR REPLACE FUNCTION set_ocr_status_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process PDF and image files
  IF NEW.file_type IN ('pdf', 'image', 'jpeg', 'jpg', 'png', 'gif', 'webp', 'tiff') THEN
    NEW.ocr_status := 'pending';
  ELSE
    -- Text-based files don't need OCR
    NEW.ocr_status := 'skipped';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set OCR status
DROP TRIGGER IF EXISTS content_library_ocr_status_trigger ON content_library;
CREATE TRIGGER content_library_ocr_status_trigger
  BEFORE INSERT ON content_library
  FOR EACH ROW
  WHEN (NEW.ocr_status IS NULL)
  EXECUTE FUNCTION set_ocr_status_on_insert();

-- Comments
COMMENT ON COLUMN content_library.ocr_status IS 'OCR processing status: pending, processing, completed, failed, skipped';
COMMENT ON COLUMN content_library.ocr_confidence IS 'Confidence score from OCR (0.00-1.00), higher is better';
COMMENT ON COLUMN content_library.ocr_provider IS 'Which OCR service was used: openai_vision, azure_di, tesseract';
COMMENT ON COLUMN content_library.destination_config IS 'JSON config for where to send extracted data (n8n workflow, API, etc.)';

