-- Change app_type to app_types (array) to support multiple application types
ALTER TABLE public.app_products 
  ADD COLUMN app_types text[] DEFAULT '{}';

-- Migrate existing data: copy single app_type to app_types array
UPDATE public.app_products 
  SET app_types = ARRAY[app_type]
  WHERE app_type IS NOT NULL AND app_types = '{}';

-- Drop the old single app_type column
ALTER TABLE public.app_products 
  DROP COLUMN app_type;

-- Add constraint to ensure at least one type is selected
ALTER TABLE public.app_products 
  ADD CONSTRAINT app_types_not_empty CHECK (array_length(app_types, 1) > 0);