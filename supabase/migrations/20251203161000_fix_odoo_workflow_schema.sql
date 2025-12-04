-- ============================================================================
-- Fix Odoo workflow input schema to use "companies" array format
-- The n8n workflow expects data in body.companies[0] not body.input
-- ============================================================================

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
            "country": { "type": "string", "description": "Country name (e.g. Norway)" }
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
        "country": "Norway"
      }
    ]
  }'::jsonb
WHERE key = 'sync-odoo' OR key ILIKE '%odoo%';


