-- Add PowerPoint support to content_library file types

-- Drop existing constraint
ALTER TABLE content_library
DROP CONSTRAINT IF EXISTS valid_file_type;

-- Add new constraint with pptx support
ALTER TABLE content_library
ADD CONSTRAINT valid_file_type CHECK (
  file_type IN ('markdown', 'pdf', 'docx', 'txt', 'html', 'pptx')
);

COMMENT ON CONSTRAINT valid_file_type ON content_library IS 
'Allowed file types for uploaded documents. pptx added for PowerPoint support.';

