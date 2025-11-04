-- Add documentation_path column to capabilities table
ALTER TABLE capabilities 
ADD COLUMN IF NOT EXISTS documentation_path TEXT;

COMMENT ON COLUMN capabilities.documentation_path IS 'Path to markdown documentation file (e.g., docs/capabilities/ai-generation.md)';
