-- Create app_vendors table
CREATE TABLE IF NOT EXISTS app_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  org_number text,
  website text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_vendors_company_id_unique UNIQUE (company_id)
);

-- Create app_products table
CREATE TABLE IF NOT EXISTS app_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_name text,
  slug text NOT NULL,
  vendor_id uuid NOT NULL REFERENCES app_vendors(id) ON DELETE CASCADE,
  app_type text NOT NULL CHECK (app_type IN ('ERP', 'CRM', 'EmailSuite', 'HRPayroll', 'BI', 'iPaaS', 'CMS', 'eCommerce', 'WMS', 'TMS', 'PLM', 'MES', 'ITSM', 'IAM', 'RPA', 'ProjectMgmt', 'ServiceMgmt')),
  deployment_models text[] NOT NULL DEFAULT '{}',
  target_industries text[] DEFAULT '{}',
  market_segments text[] DEFAULT '{}',
  modules_supported text[] DEFAULT '{}',
  localizations text[] DEFAULT '{}',
  compliances text[] DEFAULT '{}',
  pricing_model text,
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Legacy')),
  website text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_products_slug_unique UNIQUE (slug)
);

-- Create skus table with code field
CREATE TABLE IF NOT EXISTS skus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_product_id uuid NOT NULL REFERENCES app_products(id) ON DELETE CASCADE,
  edition_name text NOT NULL,
  code text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT skus_product_edition_unique UNIQUE (app_product_id, edition_name)
);

-- Create app_integrations table
CREATE TABLE IF NOT EXISTS app_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_product_id uuid NOT NULL REFERENCES app_products(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('API', 'iPaaS', 'Connector')),
  name text NOT NULL,
  spec_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create company_apps table
CREATE TABLE IF NOT EXISTS company_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  app_product_id uuid NOT NULL REFERENCES app_products(id) ON DELETE CASCADE,
  sku_id uuid REFERENCES skus(id) ON DELETE SET NULL,
  environment text,
  version text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create project_app_products table
CREATE TABLE IF NOT EXISTS project_app_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  app_product_id uuid NOT NULL REFERENCES app_products(id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN ('Longlist', 'Shortlist', 'Winner', 'Rejected')),
  rationale text,
  partner_company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create partner_certifications table
CREATE TABLE IF NOT EXISTS partner_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  app_product_id uuid NOT NULL REFERENCES app_products(id) ON DELETE CASCADE,
  certification_level text,
  certification_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create erp_extensions table
CREATE TABLE IF NOT EXISTS erp_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_product_id uuid NOT NULL UNIQUE REFERENCES app_products(id) ON DELETE CASCADE,
  modules text[] NOT NULL DEFAULT '{}',
  localizations text[] NOT NULL DEFAULT '{}',
  industries_served text[] NOT NULL DEFAULT '{}',
  certification_level text,
  partner_count integer NOT NULL DEFAULT 0,
  implementation_time_weeks integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_app_vendors_company_id ON app_vendors(company_id);
CREATE INDEX IF NOT EXISTS idx_app_products_slug ON app_products(slug);
CREATE INDEX IF NOT EXISTS idx_app_products_vendor_id ON app_products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_app_products_app_type ON app_products(app_type);
CREATE INDEX IF NOT EXISTS idx_app_products_status ON app_products(status);
CREATE INDEX IF NOT EXISTS idx_skus_app_product_id ON skus(app_product_id);
CREATE INDEX IF NOT EXISTS idx_skus_code ON skus(code);
CREATE INDEX IF NOT EXISTS idx_app_integrations_app_product_id ON app_integrations(app_product_id);
CREATE INDEX IF NOT EXISTS idx_company_apps_company_id ON company_apps(company_id);
CREATE INDEX IF NOT EXISTS idx_company_apps_app_product_id ON company_apps(app_product_id);
CREATE INDEX IF NOT EXISTS idx_project_app_products_project_id ON project_app_products(project_id);
CREATE INDEX IF NOT EXISTS idx_project_app_products_app_product_id ON project_app_products(app_product_id);
CREATE INDEX IF NOT EXISTS idx_partner_certifications_partner_id ON partner_certifications(partner_company_id);
CREATE INDEX IF NOT EXISTS idx_partner_certifications_app_product_id ON partner_certifications(app_product_id);
CREATE INDEX IF NOT EXISTS idx_erp_extensions_app_product_id ON erp_extensions(app_product_id);

-- Enable RLS on all tables
ALTER TABLE app_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_app_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_extensions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (permissive for authenticated users)
CREATE POLICY "Authenticated users can view vendors" ON app_vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage vendors" ON app_vendors FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view products" ON app_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage products" ON app_products FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view skus" ON skus FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage skus" ON skus FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view integrations" ON app_integrations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage integrations" ON app_integrations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view company apps" ON company_apps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage company apps" ON company_apps FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view project apps" ON project_app_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage project apps" ON project_app_products FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view certifications" ON partner_certifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage certifications" ON partner_certifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view erp extensions" ON erp_extensions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage erp extensions" ON erp_extensions FOR ALL TO authenticated USING (true) WITH CHECK (true);