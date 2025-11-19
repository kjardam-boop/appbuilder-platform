-- Add chunking support to ai_app_content_library
-- This enables automatic splitting of large documents by markdown headings

-- Add chunk_index column (0 for original/parent documents, 1+ for chunks)
ALTER TABLE ai_app_content_library 
ADD COLUMN IF NOT EXISTS chunk_index INTEGER DEFAULT 0 NOT NULL;

-- Add parent_doc_id for tracking which document a chunk belongs to
ALTER TABLE ai_app_content_library 
ADD COLUMN IF NOT EXISTS parent_doc_id UUID REFERENCES ai_app_content_library(id) ON DELETE CASCADE;

-- Add index for efficient chunk queries
CREATE INDEX IF NOT EXISTS idx_content_library_parent_doc 
ON ai_app_content_library(parent_doc_id) WHERE parent_doc_id IS NOT NULL;

-- Add index for chunk ordering
CREATE INDEX IF NOT EXISTS idx_content_library_chunks 
ON ai_app_content_library(parent_doc_id, chunk_index) 
WHERE parent_doc_id IS NOT NULL;

-- Create function to automatically chunk documents on insert/update
CREATE OR REPLACE FUNCTION chunk_markdown_document()
RETURNS TRIGGER AS $$
DECLARE
  chunk_text TEXT;
  chunk_title TEXT;
  heading_pattern TEXT := '(?m)^## (.+)$';
  chunks TEXT[];
  chunk_titles TEXT[];
  i INTEGER;
  parent_id UUID;
BEGIN
  -- Only chunk if document is large (>5000 chars) and not already a chunk
  IF NEW.chunk_index = 0 AND NEW.parent_doc_id IS NULL AND length(NEW.content_markdown) > 5000 THEN
    
    -- Store parent document ID
    parent_id := NEW.id;
    
    -- Split by ## headings using regex
    -- This is a simple implementation; for production you might want more sophisticated parsing
    chunks := regexp_split_to_array(NEW.content_markdown, '(?m)^## ');
    
    -- If we found multiple sections (first element will be intro before first heading)
    IF array_length(chunks, 1) > 1 THEN
      
      -- Process each chunk (skip first if it's just intro text and small)
      FOR i IN 2..array_length(chunks, 1) LOOP
        chunk_text := '## ' || chunks[i];
        
        -- Extract heading as chunk title (first line)
        chunk_title := substring(chunk_text from '^## (.+)');
        
        -- Only create chunk if it has substantial content (>200 chars)
        IF length(chunk_text) > 200 THEN
          INSERT INTO ai_app_content_library (
            tenant_id,
            title,
            content_markdown,
            keywords,
            category,
            chunk_index,
            parent_doc_id,
            is_active
          ) VALUES (
            NEW.tenant_id,
            NEW.title || ' - ' || chunk_title,
            chunk_text,
            NEW.keywords,
            NEW.category,
            i - 1,
            parent_id,
            NEW.is_active
          );
        END IF;
      END LOOP;
      
      RAISE NOTICE 'Created % chunks for document %', array_length(chunks, 1) - 1, NEW.title;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically chunk documents
DROP TRIGGER IF EXISTS trigger_chunk_markdown ON ai_app_content_library;
CREATE TRIGGER trigger_chunk_markdown
  AFTER INSERT OR UPDATE OF content_markdown
  ON ai_app_content_library
  FOR EACH ROW
  EXECUTE FUNCTION chunk_markdown_document();

-- Add helpful comment
COMMENT ON COLUMN ai_app_content_library.chunk_index IS 'Chunk index: 0 for parent documents, 1+ for auto-generated chunks';
COMMENT ON COLUMN ai_app_content_library.parent_doc_id IS 'Reference to parent document if this is a chunk';
COMMENT ON FUNCTION chunk_markdown_document() IS 'Automatically splits large documents by ## headings for better RAG performance';