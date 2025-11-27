-- Workshop Integration Migration
-- Enables Miro/Notion integration for discovery workshops

-- Add workshop columns to customer_app_projects
ALTER TABLE customer_app_projects 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id),
ADD COLUMN IF NOT EXISTS miro_board_id TEXT,
ADD COLUMN IF NOT EXISTS miro_board_url TEXT,
ADD COLUMN IF NOT EXISTS notion_page_id TEXT,
ADD COLUMN IF NOT EXISTS notion_page_url TEXT,
ADD COLUMN IF NOT EXISTS workshop_status TEXT DEFAULT 'not_started'
  CHECK (workshop_status IN ('not_started', 'preparing', 'board_ready', 'in_progress', 'complete', 'processed'));

-- Workshop results storage
CREATE TABLE IF NOT EXISTS project_workshop_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES customer_app_projects(id) ON DELETE CASCADE,
  
  -- Structured workshop outputs
  pain_points JSONB DEFAULT '[]',           -- [{text, priority, votes, category}]
  requirements JSONB DEFAULT '{}',          -- {must_have: [], should_have: [], could_have: [], wont_have: []}
  user_stories JSONB DEFAULT '[]',          -- [{role, action, benefit, priority, acceptance_criteria}]
  process_flows JSONB DEFAULT '[]',         -- [{name, steps: [], systems: [], actors: [], pain_points: []}]
  wireframe_refs JSONB DEFAULT '[]',        -- [{name, miro_frame_id, description, image_url}]
  integrations_needed JSONB DEFAULT '[]',   -- [{source_system, target_system, data_flow, frequency}]
  
  -- AI-generated summaries
  executive_summary TEXT,
  technical_summary TEXT,
  architecture_mermaid TEXT,   -- Mermaid diagram code for C4/system context
  data_model_mermaid TEXT,     -- Mermaid ER diagram
  
  -- External references
  miro_board_id TEXT,
  notion_page_id TEXT,
  
  -- Workshop metadata
  workshop_date DATE,
  facilitator_id UUID REFERENCES auth.users(id),
  facilitator_notes TEXT,
  attendees JSONB DEFAULT '[]',             -- [{name, role, email, company}]
  duration_minutes INTEGER,
  
  -- Raw data from Miro (for reprocessing)
  raw_miro_export JSONB,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(project_id)
);

-- Discovery questionnaire responses (for Step 2)
CREATE TABLE IF NOT EXISTS project_questionnaire_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES customer_app_projects(id) ON DELETE CASCADE,
  
  question_key TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer TEXT,
  
  -- AI categorization (populated after submission)
  category TEXT,              -- 'pain_point', 'need', 'goal', 'risk', 'requirement', 'constraint'
  sentiment TEXT,             -- 'positive', 'neutral', 'negative'
  priority_score INTEGER,     -- AI-assigned 1-10
  keywords TEXT[],            -- Extracted keywords for matching
  
  -- Ordering
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(project_id, question_key)
);

-- Workflow templates for n8n (Miro/Notion workflows)
CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,     -- 'workshop', 'crm_sync', 'erp_sync', 'alerts', 'custom'
  
  -- n8n configuration
  n8n_workflow_id TEXT,           -- ID in n8n
  n8n_webhook_path TEXT,          -- Webhook path (e.g., /webhook/prepare-workshop)
  
  -- Requirements
  required_systems TEXT[],         -- ['miro', 'notion']
  required_credentials TEXT[],     -- ['miro_api_key', 'notion_api_key']
  
  -- Configuration schema (for UI form generation)
  input_schema JSONB,              -- JSON Schema for inputs
  output_schema JSONB,             -- Expected output format
  
  -- Data mapping template
  default_mapping JSONB,           -- Default field mappings
  
  -- Scheduling options
  schedule_options TEXT[],         -- ['manual', 'hourly', 'daily', 'realtime', 'on_event']
  
  -- Documentation
  documentation_url TEXT,
  example_output JSONB,
  
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false, -- System templates can't be deleted
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tenant workflow instances (when a tenant activates a template)
CREATE TABLE IF NOT EXISTS tenant_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id UUID REFERENCES workflow_templates(id),
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Credentials (references to vault or tenant_integrations)
  credentials_config JSONB,        -- { "miro": "integration_id_xxx", "notion": "integration_id_yyy" }
  
  -- Custom configuration
  schedule TEXT,                   -- Cron expression if scheduled
  custom_mapping JSONB,            -- Override default mappings
  webhook_secret TEXT,             -- For callback verification
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  last_status TEXT,
  last_error TEXT,
  run_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, name)
);

-- Project systems mapping (which systems does the project integrate with)
CREATE TABLE IF NOT EXISTS project_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES customer_app_projects(id) ON DELETE CASCADE,
  external_system_id UUID REFERENCES external_systems(id),
  
  -- If custom system not in catalog
  custom_system_name TEXT,
  custom_system_type TEXT,        -- 'erp', 'crm', 'bi', 'custom'
  
  -- Integration details
  integration_priority TEXT DEFAULT 'should_have'
    CHECK (integration_priority IN ('must_have', 'should_have', 'could_have', 'wont_have')),
  data_direction TEXT DEFAULT 'bidirectional'
    CHECK (data_direction IN ('inbound', 'outbound', 'bidirectional')),
  sync_frequency TEXT,            -- 'realtime', 'hourly', 'daily', 'manual'
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(project_id, external_system_id),
  
  -- Either external_system_id or custom_system_name must be set
  CONSTRAINT system_reference_check CHECK (
    external_system_id IS NOT NULL OR custom_system_name IS NOT NULL
  )
);

-- Enable RLS
ALTER TABLE project_workshop_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_systems ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Workshop results: accessible through project's tenant
CREATE POLICY "Users can view workshop results for their tenant projects"
ON project_workshop_results FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM customer_app_projects p
    JOIN user_roles ur ON ur.scope_id = p.tenant_id AND ur.scope_type = 'tenant'
    WHERE p.id = project_workshop_results.project_id
    AND ur.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage workshop results for their tenant projects"
ON project_workshop_results FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM customer_app_projects p
    JOIN user_roles ur ON ur.scope_id = p.tenant_id AND ur.scope_type = 'tenant'
    WHERE p.id = project_workshop_results.project_id
    AND ur.user_id = auth.uid()
    AND ur.role IN ('tenant_admin', 'tenant_owner', 'platform_admin', 'platform_owner')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM customer_app_projects p
    JOIN user_roles ur ON ur.scope_id = p.tenant_id AND ur.scope_type = 'tenant'
    WHERE p.id = project_workshop_results.project_id
    AND ur.user_id = auth.uid()
    AND ur.role IN ('tenant_admin', 'tenant_owner', 'platform_admin', 'platform_owner')
  )
);

-- Questionnaire responses
CREATE POLICY "Users can view questionnaire responses for their tenant projects"
ON project_questionnaire_responses FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM customer_app_projects p
    JOIN user_roles ur ON ur.scope_id = p.tenant_id AND ur.scope_type = 'tenant'
    WHERE p.id = project_questionnaire_responses.project_id
    AND ur.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage questionnaire responses for their tenant projects"
ON project_questionnaire_responses FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM customer_app_projects p
    JOIN user_roles ur ON ur.scope_id = p.tenant_id AND ur.scope_type = 'tenant'
    WHERE p.id = project_questionnaire_responses.project_id
    AND ur.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM customer_app_projects p
    JOIN user_roles ur ON ur.scope_id = p.tenant_id AND ur.scope_type = 'tenant'
    WHERE p.id = project_questionnaire_responses.project_id
    AND ur.user_id = auth.uid()
  )
);

-- Workflow templates: public read for active templates
CREATE POLICY "Anyone can view active workflow templates"
ON workflow_templates FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Platform admins can manage workflow templates"
ON workflow_templates FOR ALL
TO authenticated
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));

-- Tenant workflows: tenant-isolated
CREATE POLICY "Users can view their tenant workflows"
ON tenant_workflows FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND scope_type = 'tenant'
    AND scope_id = tenant_workflows.tenant_id
  )
);

CREATE POLICY "Tenant admins can manage their tenant workflows"
ON tenant_workflows FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND scope_type = 'tenant'
    AND scope_id = tenant_workflows.tenant_id
    AND role IN ('tenant_admin', 'tenant_owner', 'platform_admin', 'platform_owner')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND scope_type = 'tenant'
    AND scope_id = tenant_workflows.tenant_id
    AND role IN ('tenant_admin', 'tenant_owner', 'platform_admin', 'platform_owner')
  )
);

-- Project systems
CREATE POLICY "Users can view project systems for their tenant projects"
ON project_systems FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM customer_app_projects p
    JOIN user_roles ur ON ur.scope_id = p.tenant_id AND ur.scope_type = 'tenant'
    WHERE p.id = project_systems.project_id
    AND ur.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage project systems for their tenant projects"
ON project_systems FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM customer_app_projects p
    JOIN user_roles ur ON ur.scope_id = p.tenant_id AND ur.scope_type = 'tenant'
    WHERE p.id = project_systems.project_id
    AND ur.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM customer_app_projects p
    JOIN user_roles ur ON ur.scope_id = p.tenant_id AND ur.scope_type = 'tenant'
    WHERE p.id = project_systems.project_id
    AND ur.user_id = auth.uid()
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workshop_results_project ON project_workshop_results(project_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_project ON project_questionnaire_responses(project_id);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_category ON workflow_templates(category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tenant_workflows_tenant ON tenant_workflows(tenant_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_project_systems_project ON project_systems(project_id);
CREATE INDEX IF NOT EXISTS idx_customer_app_projects_workshop_status ON customer_app_projects(workshop_status);
CREATE INDEX IF NOT EXISTS idx_customer_app_projects_company ON customer_app_projects(company_id);

-- Insert default workflow templates
INSERT INTO workflow_templates (key, name, description, category, n8n_webhook_path, required_systems, is_system)
VALUES 
  ('prepare-miro-workshop', 'Prepare Miro Workshop Board', 
   'Creates a Miro board from template and populates with company/discovery data', 
   'workshop', '/webhook/prepare-miro-workshop', 
   ARRAY['miro'], true),
   
  ('process-workshop-results', 'Process Workshop Results', 
   'Extracts data from Miro board, summarizes with AI, creates Notion documentation', 
   'workshop', '/webhook/process-workshop-results', 
   ARRAY['miro', 'notion'], true),
   
  ('sync-workshop-to-notion', 'Sync Workshop to Notion', 
   'Updates Notion documentation with latest workshop changes', 
   'workshop', '/webhook/sync-workshop-notion', 
   ARRAY['notion'], true)
ON CONFLICT (key) DO NOTHING;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_workshop_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workshop_results_updated_at
  BEFORE UPDATE ON project_workshop_results
  FOR EACH ROW
  EXECUTE FUNCTION update_workshop_updated_at();

CREATE TRIGGER questionnaire_responses_updated_at
  BEFORE UPDATE ON project_questionnaire_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_workshop_updated_at();

CREATE TRIGGER workflow_templates_updated_at
  BEFORE UPDATE ON workflow_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_workshop_updated_at();

CREATE TRIGGER tenant_workflows_updated_at
  BEFORE UPDATE ON tenant_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_workshop_updated_at();

-- Add comment for documentation
COMMENT ON TABLE project_workshop_results IS 'Stores structured outputs from Miro discovery workshops';
COMMENT ON TABLE project_questionnaire_responses IS 'Stores customer answers to AI-generated discovery questions';
COMMENT ON TABLE workflow_templates IS 'Catalog of n8n workflow templates for various integrations';
COMMENT ON TABLE tenant_workflows IS 'Tenant-specific workflow configurations and credentials';
COMMENT ON TABLE project_systems IS 'Maps which external systems a project needs to integrate with';

