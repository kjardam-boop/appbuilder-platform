-- ============================================================================
-- Phase 2: Create App Categories Table (replaces hardcoded app_types enum)
-- ============================================================================

-- Step 1: Create app_categories table
CREATE TABLE IF NOT EXISTS public.app_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  icon_name text DEFAULT 'Folder',
  parent_key text REFERENCES public.app_categories(key) ON DELETE SET NULL,
  documentation_url text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Step 2: Create trigger for updated_at
CREATE TRIGGER update_app_categories_updated_at
  BEFORE UPDATE ON public.app_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_applications_updated_at();

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_app_categories_key ON public.app_categories(key);
CREATE INDEX IF NOT EXISTS idx_app_categories_slug ON public.app_categories(slug);
CREATE INDEX IF NOT EXISTS idx_app_categories_parent ON public.app_categories(parent_key);
CREATE INDEX IF NOT EXISTS idx_app_categories_active ON public.app_categories(is_active) WHERE is_active = true;

-- Step 4: Enable RLS
ALTER TABLE public.app_categories ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
CREATE POLICY "Anyone can view active categories"
  ON public.app_categories
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Platform admins can manage categories"
  ON public.app_categories
  FOR ALL
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- Step 6: Add category relationship to app_products
ALTER TABLE public.app_products
ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.app_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_app_products_category ON public.app_products(category_id);

-- Step 7: Seed standard categories
INSERT INTO public.app_categories (key, name, slug, description, icon_name, sort_order) VALUES
  ('crm', 'CRM', 'crm', 'Customer Relationship Management systems', 'Users', 10),
  ('erp', 'ERP', 'erp', 'Enterprise Resource Planning systems', 'Building2', 20),
  ('commerce', 'Commerce', 'commerce', 'E-commerce and sales platforms', 'ShoppingCart', 30),
  ('communication', 'Communication', 'communication', 'Email, messaging, and collaboration tools', 'MessageSquare', 40),
  ('file_storage', 'File Storage', 'file-storage', 'Cloud storage and file management', 'HardDrive', 50),
  ('social_media', 'Social Media', 'social-media', 'Social networking and content platforms', 'Share2', 60),
  ('marketing', 'Marketing', 'marketing', 'Marketing automation and analytics', 'TrendingUp', 70),
  ('surveys_forms', 'Surveys & Forms', 'surveys-forms', 'Survey and form building tools', 'ClipboardList', 80),
  ('language', 'Language Tools', 'language-tools', 'Translation and language services', 'Languages', 90),
  ('hr', 'HR & Payroll', 'hr-payroll', 'Human resources and payroll systems', 'Briefcase', 100),
  ('analytics', 'Analytics', 'analytics', 'Business intelligence and analytics', 'BarChart3', 110),
  ('developer_tools', 'Developer Tools', 'developer-tools', 'APIs, SDKs, and developer platforms', 'Code', 120),
  ('productivity', 'Productivity', 'productivity', 'Task management and productivity apps', 'CheckSquare', 130),
  ('databases', 'Databases', 'databases', 'Database management systems', 'Database', 140),
  ('smart_home', 'Smart Home', 'smart-home', 'Home automation and IoT devices', 'Home', 150),
  ('travel', 'Travel', 'travel', 'Travel booking and management', 'Plane', 160),
  ('helpdesk', 'Help Desk & Support', 'helpdesk-support', 'Customer support and ticketing systems', 'LifeBuoy', 170),
  ('web_dev', 'Web & App Development', 'web-app-development', 'Website builders and app development platforms', 'Globe', 180),
  ('accounting', 'Accounting', 'accounting', 'Financial accounting and bookkeeping', 'Calculator', 190),
  ('project_mgmt', 'Project Management', 'project-management', 'Project planning and management tools', 'FolderKanban', 200)
ON CONFLICT (key) DO NOTHING;

-- Step 8: Migrate existing app_types to categories (map first app_type to category)
-- This creates a best-effort mapping - manual review recommended
UPDATE public.app_products
SET category_id = (
  SELECT id FROM public.app_categories
  WHERE LOWER(key) = LOWER(app_products.app_types[1])
  LIMIT 1
)
WHERE category_id IS NULL
  AND app_types IS NOT NULL
  AND array_length(app_types, 1) > 0;

-- Step 9: Add comments
COMMENT ON TABLE public.app_categories IS 'Hierarchical taxonomy for external system classification';
COMMENT ON COLUMN public.app_categories.key IS 'Unique machine-readable identifier';
COMMENT ON COLUMN public.app_categories.parent_key IS 'Supports nested categories for future expansion';
COMMENT ON COLUMN public.app_products.category_id IS 'Primary category classification (replaces app_types array)';

-- Step 10: Create view for category hierarchy
CREATE OR REPLACE VIEW public.app_categories_tree AS
SELECT 
  c.id,
  c.key,
  c.name,
  c.slug,
  c.description,
  c.icon_name,
  c.parent_key,
  pc.name as parent_name,
  c.sort_order,
  c.is_active,
  (SELECT COUNT(*) FROM public.app_products WHERE category_id = c.id) as product_count
FROM public.app_categories c
LEFT JOIN public.app_categories pc ON c.parent_key = pc.key
WHERE c.is_active = true
ORDER BY c.sort_order, c.name;