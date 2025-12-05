-- Add workflow_json and version columns to workflow_templates
ALTER TABLE workflow_templates 
ADD COLUMN IF NOT EXISTS workflow_json JSONB,
ADD COLUMN IF NOT EXISTS version TEXT DEFAULT '1.0.0',
ADD COLUMN IF NOT EXISTS changelog TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_workflow_templates_key ON workflow_templates(key);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_category ON workflow_templates(category);

-- Comment
COMMENT ON COLUMN workflow_templates.workflow_json IS 'Full n8n workflow JSON for this template';
COMMENT ON COLUMN workflow_templates.version IS 'Semantic version of the template (e.g., 1.0.0, 2.0.0)';
COMMENT ON COLUMN workflow_templates.changelog IS 'Description of changes in this version';

-- Seed prepare-miro-workshop v2 template
INSERT INTO workflow_templates (
  key, 
  name, 
  description, 
  category, 
  n8n_webhook_path, 
  required_systems, 
  required_credentials,
  version,
  changelog,
  workflow_json,
  is_active,
  is_system
)
VALUES (
  'prepare-miro-workshop-v2',
  'Prepare Miro Workshop Board v2',
  'AI-støttet workshop board: Oppretter Miro board med 4 frames (Kontekst, Smertepunkter, Løsninger, MoSCoW) og populerer automatisk med AI-genererte elementer basert på prosjektkontekst.',
  'workshop',
  '/webhook/prepare-miro-workshop',
  ARRAY['miro'],
  ARRAY['miro_oauth', 'supabase_postgres'],
  '2.0.0',
  'v2.0.0: Lagt til støtte for AI-genererte elementer, 4 frames, MoSCoW prioritering',
  '{
    "name": "Prepare Miro Workshop Board v2",
    "nodes": [
      {
        "parameters": {"httpMethod": "POST", "path": "prepare-miro-workshop", "responseMode": "responseNode", "options": {}},
        "id": "webhook-trigger",
        "name": "Webhook Trigger",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 2,
        "position": [0, 300]
      },
      {
        "parameters": {"jsCode": "const input = $input.first().json;\nconst projectId = input.body?.input?.project_id;\nconst companyId = input.body?.input?.company_id;\nconst aiElements = input.body?.input?.ai_elements || [];\nconst aiSummary = input.body?.input?.ai_summary || \"\";\nconst context = input.body?.context || {};\nif (!projectId) throw new Error(\"project_id is required\");\nreturn { projectId, companyId, aiElements, aiSummary, tenantId: context.tenant_id, userId: context.user_id };"},
        "id": "parse-input",
        "name": "Parse Input",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [220, 300]
      },
      {
        "parameters": {"operation": "executeQuery", "query": "SELECT cap.id, cap.name, cap.description, c.name as company_name, c.industry_description FROM customer_app_projects cap LEFT JOIN companies c ON c.id = cap.company_id WHERE cap.id = ''{{ $json.projectId }}''::uuid", "options": {}},
        "id": "get-project",
        "name": "Get Project & Company",
        "type": "n8n-nodes-base.postgres",
        "typeVersion": 2.5,
        "position": [440, 300]
      },
      {
        "parameters": {"method": "POST", "url": "https://api.miro.com/v2/boards", "authentication": "predefinedCredentialType", "nodeCredentialType": "miroOAuth2Api", "sendBody": true, "specifyBody": "json", "jsonBody": "={\"name\": \"{{ $node[''Get Project & Company''].json[0].company_name }} - Discovery Workshop\"}"},
        "id": "create-miro-board",
        "name": "Create Miro Board",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [660, 300]
      },
      {
        "parameters": {"method": "POST", "url": "=https://api.miro.com/v2/boards/{{ $node[''Create Miro Board''].json.id }}/frames", "authentication": "predefinedCredentialType", "nodeCredentialType": "miroOAuth2Api", "sendBody": true, "specifyBody": "json", "jsonBody": "{\"data\": {\"title\": \"1. Kontekst & Bakgrunn\"}}"},
        "id": "create-context-frame",
        "name": "Create Context Frame",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [880, 100]
      },
      {
        "parameters": {"method": "POST", "url": "=https://api.miro.com/v2/boards/{{ $node[''Create Miro Board''].json.id }}/frames", "authentication": "predefinedCredentialType", "nodeCredentialType": "miroOAuth2Api", "sendBody": true, "specifyBody": "json", "jsonBody": "{\"data\": {\"title\": \"2. Smertepunkter\"}}"},
        "id": "create-painpoints-frame",
        "name": "Create Pain Points Frame",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [880, 300]
      },
      {
        "parameters": {"method": "POST", "url": "=https://api.miro.com/v2/boards/{{ $node[''Create Miro Board''].json.id }}/frames", "authentication": "predefinedCredentialType", "nodeCredentialType": "miroOAuth2Api", "sendBody": true, "specifyBody": "json", "jsonBody": "{\"data\": {\"title\": \"3. Løsningsforslag\"}}"},
        "id": "create-solutions-frame",
        "name": "Create Solutions Frame",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [880, 500]
      },
      {
        "parameters": {"method": "POST", "url": "=https://api.miro.com/v2/boards/{{ $node[''Create Miro Board''].json.id }}/frames", "authentication": "predefinedCredentialType", "nodeCredentialType": "miroOAuth2Api", "sendBody": true, "specifyBody": "json", "jsonBody": "{\"data\": {\"title\": \"4. MoSCoW Prioritering\"}}"},
        "id": "create-moscow-frame",
        "name": "Create MoSCoW Frame",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [880, 700]
      },
      {
        "parameters": {"jsCode": "const boardId = $node[''Create Miro Board''].json.id;\nconst aiElements = $node[''Parse Input''].json.aiElements || [];\nreturn aiElements.map((e, i) => ({boardId, title: e.title, content: e.content, color: e.color || ''yellow'', x: 100 + (i % 3) * 420, y: 100 + Math.floor(i / 3) * 220}));"},
        "id": "prepare-ai-elements",
        "name": "Prepare AI Elements",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [1100, 400]
      },
      {
        "parameters": {"method": "POST", "url": "=https://api.miro.com/v2/boards/{{ $json.boardId }}/sticky_notes", "authentication": "predefinedCredentialType", "nodeCredentialType": "miroOAuth2Api", "sendBody": true, "specifyBody": "json", "jsonBody": "={\"data\": {\"content\": \"{{ $json.title }}\"}, \"style\": {\"fillColor\": \"{{ $json.color }}\"}}"},
        "id": "add-ai-stickies",
        "name": "Add AI Stickies",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [1320, 400]
      },
      {
        "parameters": {"respondWith": "json", "responseBody": "={\"success\": true, \"board_url\": \"{{ $node[''Create Miro Board''].json.viewLink }}\"}"},
        "id": "respond-success",
        "name": "Respond Success",
        "type": "n8n-nodes-base.respondToWebhook",
        "typeVersion": 1.1,
        "position": [1540, 400]
      }
    ],
    "connections": {
      "Webhook Trigger": {"main": [[{"node": "Parse Input", "type": "main", "index": 0}]]},
      "Parse Input": {"main": [[{"node": "Get Project & Company", "type": "main", "index": 0}]]},
      "Get Project & Company": {"main": [[{"node": "Create Miro Board", "type": "main", "index": 0}]]},
      "Create Miro Board": {"main": [[{"node": "Create Context Frame", "type": "main", "index": 0}, {"node": "Create Pain Points Frame", "type": "main", "index": 0}, {"node": "Create Solutions Frame", "type": "main", "index": 0}, {"node": "Create MoSCoW Frame", "type": "main", "index": 0}]]},
      "Create Context Frame": {"main": [[{"node": "Prepare AI Elements", "type": "main", "index": 0}]]},
      "Prepare AI Elements": {"main": [[{"node": "Add AI Stickies", "type": "main", "index": 0}]]},
      "Add AI Stickies": {"main": [[{"node": "Respond Success", "type": "main", "index": 0}]]}
    },
    "settings": {"executionOrder": "v1"}
  }'::jsonb,
  true,
  true
)
ON CONFLICT (key) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  version = EXCLUDED.version,
  changelog = EXCLUDED.changelog,
  workflow_json = EXCLUDED.workflow_json,
  updated_at = NOW();

-- Also update the original template
UPDATE workflow_templates
SET 
  version = '1.0.0',
  changelog = 'v1.0.0: Original versjon - oppretter tom Miro board',
  workflow_json = '{
    "name": "Prepare Miro Workshop Board",
    "nodes": [
      {"id": "webhook-trigger", "name": "Webhook Trigger", "type": "n8n-nodes-base.webhook", "typeVersion": 2, "position": [0, 300], "parameters": {"httpMethod": "POST", "path": "prepare-miro-workshop", "responseMode": "responseNode"}},
      {"id": "parse-input", "name": "Parse Input", "type": "n8n-nodes-base.code", "typeVersion": 2, "position": [220, 300]},
      {"id": "get-project", "name": "Get Project & Company", "type": "n8n-nodes-base.postgres", "typeVersion": 2.5, "position": [440, 300]},
      {"id": "create-miro-board", "name": "Create Miro Board", "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.2, "position": [660, 300]},
      {"id": "respond-success", "name": "Respond Success", "type": "n8n-nodes-base.respondToWebhook", "typeVersion": 1.1, "position": [880, 300]}
    ],
    "connections": {},
    "settings": {"executionOrder": "v1"}
  }'::jsonb
WHERE key = 'prepare-miro-workshop';

