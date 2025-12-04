-- ============================================================================
-- Add input_schema and example_output to workflow_templates
-- This enables better "Bruk mal" functionality in the admin UI
-- ============================================================================

-- Update sync-odoo workflow with proper input_schema
-- NOTE: The workflow expects "companies" array wrapping the company data
UPDATE workflow_templates
SET 
  input_schema = '{
    "type": "object",
    "properties": {
      "companies": {
        "type": "array",
        "description": "Array of companies to sync",
        "items": {
          "type": "object",
          "properties": {
            "id": { "type": "string", "description": "Platform company UUID" },
            "odoo_partner_id": { "type": "number", "description": "Existing Odoo partner ID (null for new)" },
            "name": { "type": "string", "description": "Company name" },
            "org_number": { "type": "string", "description": "Organization number (VAT)" },
            "website": { "type": "string", "description": "Company website URL" },
            "employees": { "type": "number", "description": "Number of employees" },
            "slug": { "type": "string", "description": "URL-friendly company identifier" },
            "country": { "type": "string", "description": "Country name (e.g. Norway)" },
            "org_form": { "type": "string", "description": "Organization form (e.g. AS, ENK)" },
            "industry_code": { "type": "string", "description": "Industry code (NACE)" },
            "industry_description": { "type": "string", "description": "Industry description" },
            "segment": { "type": "string", "description": "Business segment" },
            "company_roles": { "type": "array", "items": { "type": "string" } },
            "company_metadata": { "type": "object" }
          },
          "required": ["id", "name"]
        }
      }
    },
    "required": ["companies"]
  }'::jsonb,
  example_output = '{
    "companies": [
      {
        "id": "ERSTATT-MED-EKTE-UUID",
        "odoo_partner_id": null,
        "name": "Test Firma AS",
        "org_number": "123456789",
        "website": "https://testfirma.no",
        "employees": 10,
        "slug": "test-firma-as",
        "country": "Norway",
        "org_form": "AS",
        "industry_code": "62.010",
        "industry_description": "Programmeringstjenester",
        "segment": "SMB",
        "company_roles": ["customer"],
        "company_metadata": null
      }
    ]
  }'::jsonb
WHERE key = 'sync-odoo' OR key ILIKE '%odoo%';

-- Update prepare-miro-workshop with input_schema
UPDATE workflow_templates
SET 
  input_schema = '{
    "type": "object",
    "properties": {
      "project_id": { "type": "string", "description": "Project UUID" },
      "company_name": { "type": "string", "description": "Company name for the workshop" },
      "workshop_type": { "type": "string", "description": "Type of workshop (discovery, requirements, etc.)" }
    },
    "required": ["project_id"]
  }'::jsonb,
  example_output = '{
    "project_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "company_name": "Test Firma AS",
    "workshop_type": "discovery"
  }'::jsonb
WHERE key = 'prepare-miro-workshop';

-- Update sync-capability-to-notion with input_schema  
UPDATE workflow_templates
SET
  input_schema = '{
    "type": "object",
    "properties": {
      "capability_id": { "type": "string", "description": "Capability UUID" },
      "capability_key": { "type": "string", "description": "Capability key identifier" },
      "name": { "type": "string", "description": "Capability name" },
      "description": { "type": "string", "description": "Capability description" }
    },
    "required": ["capability_id", "capability_key"]
  }'::jsonb,
  example_output = '{
    "capability_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "capability_key": "task-management",
    "name": "Task Management",
    "description": "Oppgavehåndtering for prosjekter"
  }'::jsonb
WHERE key ILIKE '%notion%' OR key ILIKE '%capability%';

-- Add comment
COMMENT ON COLUMN workflow_templates.input_schema IS 'JSON Schema defining expected input format for the workflow webhook';
COMMENT ON COLUMN workflow_templates.example_output IS 'Example payload that can be used for testing the workflow';

