
-- Add app_key field to customer_app_projects to support predefined app routes
ALTER TABLE public.customer_app_projects
ADD COLUMN app_key TEXT;

COMMENT ON COLUMN public.customer_app_projects.app_key IS 'Optional key for predefined app routes (e.g., "jul25" maps to /apps/jul25)';

-- Update existing Jul25 app to use app_key
UPDATE public.customer_app_projects
SET app_key = 'jul25'
WHERE name LIKE '%Jul25%' OR name LIKE '%Familiejul%';
