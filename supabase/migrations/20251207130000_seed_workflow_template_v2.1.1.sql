-- Seed prepare-miro-workshop v2.1.1 template
-- v2.1.1: Fixed Miro Frame API - moved width/height from data to geometry object

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
  'prepare-miro-workshop-v2.1.1',
  'Prepare Miro Workshop Board v2.1.1',
  'AI-støttet workshop board med riktig Miro API v2 format: Bruker geometry-objekt for frame-dimensjoner som Miro API krever. Inkluderer 4 frames og AI-genererte elementer.',
  'workshop',
  '/webhook/prepare-miro-workshop',
  ARRAY['miro'],
  ARRAY['miro_oauth', 'supabase_postgres'],
  '2.1.1',
  'v2.1.1: Fikset Miro Frame API - flyttet width/height fra data til geometry-objekt som Miro API v2 krever.',
  $workflow_json$
{
  "name": "Prepare Miro Workshop Board v2.1.1",
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
      "parameters": {"jsCode": "const input = $input.first().json;\nconst projectId = input.body?.input?.project_id;\nconst projectName = input.body?.input?.project_name || 'Prosjekt';\nconst companyId = input.body?.input?.company_id;\nconst companyName = input.body?.input?.company_name || 'Selskap';\nconst aiElements = input.body?.input?.ai_elements || [];\nconst aiSummary = input.body?.input?.ai_summary || '';\nconst context = input.body?.context || {};\nif (!projectId) throw new Error('project_id is required');\nreturn { projectId, projectName, companyId, companyName, aiElements, aiSummary, tenantId: context.tenant_id, userId: context.user_id };"},
      "id": "parse-input",
      "name": "Parse Input",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [220, 300]
    },
    {
      "parameters": {"operation": "executeQuery", "query": "SELECT cap.id, cap.name, cap.description, c.name as company_name, c.industry_description FROM customer_app_projects cap LEFT JOIN companies c ON c.id = cap.company_id WHERE cap.id = '{{ $json.projectId }}'::uuid", "options": {}},
      "id": "get-project",
      "name": "Get Project & Company",
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 2.5,
      "position": [440, 300]
    },
    {
      "parameters": {"method": "POST", "url": "https://api.miro.com/v2/boards", "authentication": "predefinedCredentialType", "nodeCredentialType": "miroOAuth2Api", "sendBody": true, "specifyBody": "json", "jsonBody": "={\"name\": \"{{ $node['Parse Input'].json.companyName }} - {{ $node['Parse Input'].json.projectName }}\", \"description\": \"AI-generert Discovery Workshop board\"}"},
      "id": "create-miro-board",
      "name": "Create Miro Board",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [660, 300]
    },
    {
      "parameters": {"method": "POST", "url": "=https://api.miro.com/v2/boards/{{ $node['Create Miro Board'].json.id }}/frames", "authentication": "predefinedCredentialType", "nodeCredentialType": "miroOAuth2Api", "sendBody": true, "specifyBody": "json", "jsonBody": "{\"data\": {\"title\": \"1. Kontekst & Bakgrunn\", \"format\": \"custom\"}, \"geometry\": {\"width\": 1400, \"height\": 800}, \"position\": {\"x\": 0, \"y\": 0}}"},
      "id": "create-context-frame",
      "name": "Create Context Frame",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [880, 100]
    },
    {
      "parameters": {"method": "POST", "url": "=https://api.miro.com/v2/boards/{{ $node['Create Miro Board'].json.id }}/frames", "authentication": "predefinedCredentialType", "nodeCredentialType": "miroOAuth2Api", "sendBody": true, "specifyBody": "json", "jsonBody": "{\"data\": {\"title\": \"2. Smertepunkter\", \"format\": \"custom\"}, \"geometry\": {\"width\": 1400, \"height\": 800}, \"position\": {\"x\": 1600, \"y\": 0}}"},
      "id": "create-painpoints-frame",
      "name": "Create Pain Points Frame",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [880, 300]
    },
    {
      "parameters": {"method": "POST", "url": "=https://api.miro.com/v2/boards/{{ $node['Create Miro Board'].json.id }}/frames", "authentication": "predefinedCredentialType", "nodeCredentialType": "miroOAuth2Api", "sendBody": true, "specifyBody": "json", "jsonBody": "{\"data\": {\"title\": \"3. Løsningsforslag\", \"format\": \"custom\"}, \"geometry\": {\"width\": 1400, \"height\": 800}, \"position\": {\"x\": 0, \"y\": 1000}}"},
      "id": "create-solutions-frame",
      "name": "Create Solutions Frame",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [880, 500]
    },
    {
      "parameters": {"method": "POST", "url": "=https://api.miro.com/v2/boards/{{ $node['Create Miro Board'].json.id }}/frames", "authentication": "predefinedCredentialType", "nodeCredentialType": "miroOAuth2Api", "sendBody": true, "specifyBody": "json", "jsonBody": "{\"data\": {\"title\": \"4. MoSCoW Prioritering\", \"format\": \"custom\"}, \"geometry\": {\"width\": 2000, \"height\": 800}, \"position\": {\"x\": 1600, \"y\": 1000}}"},
      "id": "create-moscow-frame",
      "name": "Create MoSCoW Frame",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [880, 700]
    },
    {
      "parameters": {"jsCode": "const boardId = $node['Create Miro Board'].json.id;\nconst frameId = $node['Create Context Frame'].json.id;\nconst project = $node['Get Project & Company'].json[0] || {};\nreturn { boardId, frameId, companyName: project.company_name || 'Ukjent', projectName: project.name || 'Ukjent', description: project.description || '', industry: project.industry_description || 'Ikke spesifisert' };"},
      "id": "prepare-company-data",
      "name": "Prepare Company Data",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1100, 100]
    },
    {
      "parameters": {"method": "POST", "url": "=https://api.miro.com/v2/boards/{{ $json.boardId }}/sticky_notes", "authentication": "predefinedCredentialType", "nodeCredentialType": "miroOAuth2Api", "sendBody": true, "specifyBody": "json", "jsonBody": "={\"data\": {\"content\": \"<strong>{{ $json.companyName }}</strong>\\n\\nProsjekt: {{ $json.projectName }}\\n\\nBransje: {{ $json.industry }}\", \"shape\": \"square\"}, \"style\": {\"fillColor\": \"light_blue\"}, \"position\": {\"x\": 100, \"y\": 100}, \"geometry\": {\"width\": 400, \"height\": 300}, \"parent\": {\"id\": \"{{ $json.frameId }}\"}}"},
      "id": "add-company-sticky",
      "name": "Add Company Sticky",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [1320, 100]
    },
    {
      "parameters": {"jsCode": "const boardId = $node['Create Miro Board'].json.id;\nconst aiElements = $node['Parse Input'].json.aiElements || [];\nif (aiElements.length === 0) return [];\nconst validColors = ['gray', 'light_yellow', 'yellow', 'orange', 'light_green', 'green', 'dark_green', 'cyan', 'light_pink', 'pink', 'violet', 'red', 'light_blue', 'blue', 'dark_blue', 'black'];\nreturn aiElements.map((e, i) => { const x = e.position?.x ?? 100 + (i % 3) * 420; const y = e.position?.y ?? 100 + Math.floor(i / 3) * 220; let color = (e.color || 'yellow').toLowerCase(); if (!validColors.includes(color)) color = 'yellow'; return { boardId, title: e.title || '', content: e.content || e.title || '', color, x, y }; });"},
      "id": "prepare-ai-elements",
      "name": "Prepare AI Elements",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1100, 400]
    },
    {
      "parameters": {"method": "POST", "url": "=https://api.miro.com/v2/boards/{{ $json.boardId }}/sticky_notes", "authentication": "predefinedCredentialType", "nodeCredentialType": "miroOAuth2Api", "sendBody": true, "specifyBody": "json", "jsonBody": "={\"data\": {\"content\": \"<strong>{{ $json.title }}</strong>\\n\\n{{ $json.content.substring(0, 250) }}\", \"shape\": \"square\"}, \"style\": {\"fillColor\": \"{{ $json.color }}\"}, \"position\": {\"x\": {{ $json.x }}, \"y\": {{ $json.y }}}, \"geometry\": {\"width\": 380, \"height\": 180}}"},
      "id": "add-ai-stickies",
      "name": "Add AI Stickies",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [1320, 400]
    },
    {
      "parameters": {"jsCode": "const boardId = $node['Create Miro Board'].json.id;\nconst viewLink = $node['Create Miro Board'].json.viewLink;\nconst projectId = $node['Parse Input'].json.projectId;\nconst aiElements = $node['Parse Input'].json.aiElements || [];\nreturn { success: true, board_id: boardId, board_url: viewLink, project_id: projectId, elements_created: aiElements.length, status: 'board_ready', version: '2.1.1' };"},
      "id": "prepare-response",
      "name": "Prepare Response",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1540, 400]
    },
    {
      "parameters": {"respondWith": "json", "responseBody": "={{ JSON.stringify($json) }}"},
      "id": "respond-success",
      "name": "Respond Success",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.1,
      "position": [1760, 400]
    }
  ],
  "connections": {
    "Webhook Trigger": {"main": [[{"node": "Parse Input", "type": "main", "index": 0}]]},
    "Parse Input": {"main": [[{"node": "Get Project & Company", "type": "main", "index": 0}]]},
    "Get Project & Company": {"main": [[{"node": "Create Miro Board", "type": "main", "index": 0}]]},
    "Create Miro Board": {"main": [[{"node": "Create Context Frame", "type": "main", "index": 0}, {"node": "Create Pain Points Frame", "type": "main", "index": 0}, {"node": "Create Solutions Frame", "type": "main", "index": 0}, {"node": "Create MoSCoW Frame", "type": "main", "index": 0}]]},
    "Create Context Frame": {"main": [[{"node": "Prepare Company Data", "type": "main", "index": 0}, {"node": "Prepare AI Elements", "type": "main", "index": 0}]]},
    "Create Pain Points Frame": {"main": [[{"node": "Prepare AI Elements", "type": "main", "index": 0}]]},
    "Create Solutions Frame": {"main": [[{"node": "Prepare AI Elements", "type": "main", "index": 0}]]},
    "Create MoSCoW Frame": {"main": [[{"node": "Prepare AI Elements", "type": "main", "index": 0}]]},
    "Prepare Company Data": {"main": [[{"node": "Add Company Sticky", "type": "main", "index": 0}]]},
    "Add Company Sticky": {"main": [[{"node": "Prepare Response", "type": "main", "index": 0}]]},
    "Prepare AI Elements": {"main": [[{"node": "Add AI Stickies", "type": "main", "index": 0}]]},
    "Add AI Stickies": {"main": [[{"node": "Prepare Response", "type": "main", "index": 0}]]},
    "Prepare Response": {"main": [[{"node": "Respond Success", "type": "main", "index": 0}]]}
  },
  "settings": {"executionOrder": "v1"}
}
$workflow_json$::jsonb,
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

-- Mark v2.1.0 as superseded
UPDATE workflow_templates
SET 
  description = description || ' (Superseded by v2.1.1)',
  is_active = false
WHERE key = 'prepare-miro-workshop-v2.1.0' AND version = '2.1.0';


