-- Create companies table first (required for foreign keys)
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_number text UNIQUE,
  name text NOT NULL,
  slug text UNIQUE,
  website text,
  org_form text,
  industry_code text,
  industry_description text,
  industry_keys text[] DEFAULT '{}',
  employees integer,
  driftsinntekter numeric,
  driftsresultat numeric,
  egenkapital numeric,
  totalkapital numeric,
  company_roles text[] DEFAULT '{}',
  is_approved_supplier boolean DEFAULT false,
  supplier_certifications text[] DEFAULT '{}',
  segment text,
  crm_status text,
  customer_since date,
  last_interaction_date date,
  last_fetched_at timestamptz,
  source text DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  start_date date,
  end_date date,
  budget numeric,
  owner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_companies_org_number ON companies(org_number);
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_company_roles ON companies USING GIN(company_roles);
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated users to view companies" ON companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage companies" ON companies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to view projects" ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage projects" ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);