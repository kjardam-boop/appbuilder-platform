-- Seed prepare-miro-workshop v2.1.0 template
-- v2.1.0: Fixed positioning - uses AI-generated x/y positions from edge function

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
  'prepare-miro-workshop-v2.1.0',
  'Prepare Miro Workshop Board v2.1.0',
  'AI-støttet workshop board med riktig posisjonering: Bruker AI-genererte x/y posisjoner fra edge function. Inkluderer 4 frames (Kontekst, Smertepunkter, Løsninger, MoSCoW), geometry for alle sticky notes, og bedre tekstformatering.',
  'workshop',
  '/webhook/prepare-miro-workshop',
  ARRAY['miro'],
  ARRAY['miro_oauth', 'supabase_postgres'],
  '2.1.0',
  'v2.1.0: Fikset posisjonering - bruker nå AI-genererte x/y posisjoner fra edge function. Lagt til geometry og bedre tekstformatering.',
  $workflow_json$
{
  "name": "Prepare Miro Workshop Board v2.1.0",
  "version": "2.1.0",
  "changelog": "v2.1.0: Fikset posisjonering - bruker nå AI-genererte x/y posisjoner fra edge function. Lagt til geometry og bedre tekstformatering.",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "prepare-miro-workshop",
        "responseMode": "responseNode",
        "options": {}
      },
      "id": "webhook-trigger",
      "name": "Webhook Trigger",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [0, 300],
      "webhookId": "prepare-miro-workshop"
    },
    {
      "parameters": {
        "jsCode": "// Parse Input v2.1.0\n// Extract input data from webhook\nconst input = $input.first().json;\n\nconst projectId = input.body?.input?.project_id;\nconst projectName = input.body?.input?.project_name || 'Prosjekt';\nconst companyId = input.body?.input?.company_id;\nconst companyName = input.body?.input?.company_name || 'Selskap';\nconst systems = input.body?.input?.systems || [];\nconst questionnaire = input.body?.input?.questionnaire || {};\nconst aiElements = input.body?.input?.ai_elements || [];\nconst aiSummary = input.body?.input?.ai_summary || '';\nconst context = input.body?.context || {};\n\nif (!projectId) {\n  throw new Error('project_id is required');\n}\n\nreturn {\n  projectId,\n  projectName,\n  companyId,\n  companyName,\n  systems,\n  questionnaire,\n  aiElements,\n  aiSummary,\n  tenantId: context.tenant_id,\n  userId: context.user_id,\n  requestId: context.request_id\n};"
      },
      "id": "parse-input",
      "name": "Parse Input",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [220, 300]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "SELECT cap.id, cap.name, cap.description, cap.status, cap.workshop_status, c.id as company_id, c.name as company_name, c.industry_description, c.org_number, c.website FROM customer_app_projects cap LEFT JOIN companies c ON c.id = cap.company_id WHERE cap.id = '{{ $json.projectId }}'::uuid",
        "options": {}
      },
      "id": "get-project",
      "name": "Get Project & Company",
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 2.5,
      "position": [440, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.miro.com/v2/boards",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "miroOAuth2Api",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"name\": \"{{ $node['Parse Input'].json.companyName }} - {{ $node['Parse Input'].json.projectName }}\",\n  \"description\": \"AI-generert Discovery Workshop board\"\n}",
        "options": {}
      },
      "id": "create-miro-board",
      "name": "Create Miro Board",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [660, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://api.miro.com/v2/boards/{{ $node['Create Miro Board'].json.id }}/frames",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "miroOAuth2Api",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "{\n  \"data\": {\n    \"title\": \"1. Kontekst & Bakgrunn\",\n    \"format\": \"custom\",\n    \"width\": 1400,\n    \"height\": 800\n  },\n  \"position\": {\n    \"x\": 0,\n    \"y\": 0\n  }\n}",
        "options": {}
      },
      "id": "create-context-frame",
      "name": "Create Context Frame",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [880, 100]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://api.miro.com/v2/boards/{{ $node['Create Miro Board'].json.id }}/frames",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "miroOAuth2Api",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "{\n  \"data\": {\n    \"title\": \"2. Smertepunkter & Utfordringer\",\n    \"format\": \"custom\",\n    \"width\": 1400,\n    \"height\": 800\n  },\n  \"position\": {\n    \"x\": 1600,\n    \"y\": 0\n  }\n}",
        "options": {}
      },
      "id": "create-painpoints-frame",
      "name": "Create Pain Points Frame",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [880, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://api.miro.com/v2/boards/{{ $node['Create Miro Board'].json.id }}/frames",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "miroOAuth2Api",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "{\n  \"data\": {\n    \"title\": \"3. Løsningsforslag & Muligheter\",\n    \"format\": \"custom\",\n    \"width\": 1400,\n    \"height\": 800\n  },\n  \"position\": {\n    \"x\": 0,\n    \"y\": 1000\n  }\n}",
        "options": {}
      },
      "id": "create-solutions-frame",
      "name": "Create Solutions Frame",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [880, 500]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://api.miro.com/v2/boards/{{ $node['Create Miro Board'].json.id }}/frames",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "miroOAuth2Api",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "{\n  \"data\": {\n    \"title\": \"4. Prioritering (MoSCoW)\",\n    \"format\": \"custom\",\n    \"width\": 2000,\n    \"height\": 800\n  },\n  \"position\": {\n    \"x\": 1600,\n    \"y\": 1000\n  }\n}",
        "options": {}
      },
      "id": "create-moscow-frame",
      "name": "Create MoSCoW Frame",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [880, 700]
    },
    {
      "parameters": {
        "jsCode": "// Prepare Company Data v2.1.0\nconst boardId = $node['Create Miro Board'].json.id;\nconst frameId = $node['Create Context Frame'].json.id;\nconst project = $node['Get Project & Company'].json[0] || {};\n\nreturn {\n  boardId,\n  frameId,\n  companyName: project.company_name || 'Ukjent selskap',\n  projectName: project.name || 'Ukjent prosjekt',\n  description: project.description || '',\n  industry: project.industry_description || 'Ikke spesifisert'\n};"
      },
      "id": "prepare-company-data",
      "name": "Prepare Company Data",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1100, 100]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://api.miro.com/v2/boards/{{ $json.boardId }}/sticky_notes",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "miroOAuth2Api",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"data\": {\n    \"content\": \"<strong>{{ $json.companyName }}</strong>\\n\\nProsjekt: {{ $json.projectName }}\\n\\nBransje: {{ $json.industry }}\\n\\n{{ $json.description.substring(0, 300) }}\",\n    \"shape\": \"square\"\n  },\n  \"style\": {\n    \"fillColor\": \"light_blue\",\n    \"textAlign\": \"left\",\n    \"textAlignVertical\": \"top\"\n  },\n  \"position\": {\n    \"x\": 100,\n    \"y\": 100\n  },\n  \"geometry\": {\n    \"width\": 400,\n    \"height\": 300\n  },\n  \"parent\": {\n    \"id\": \"{{ $json.frameId }}\"\n  }\n}",
        "options": {}
      },
      "id": "add-company-sticky",
      "name": "Add Company Sticky",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [1320, 100]
    },
    {
      "parameters": {
        "jsCode": "// Prepare AI Elements v2.1.0\n// Uses positions from AI elements (generated by edge function)\nconst boardId = $node['Create Miro Board'].json.id;\nconst aiElements = $node['Parse Input'].json.aiElements || [];\n\nif (aiElements.length === 0) {\n  return [];\n}\n\nconst validColors = ['gray', 'light_yellow', 'yellow', 'orange', 'light_green', 'green', 'dark_green', 'cyan', 'light_pink', 'pink', 'violet', 'red', 'light_blue', 'blue', 'dark_blue', 'black'];\n\nreturn aiElements.map((element, index) => {\n  const x = (element.position && typeof element.position.x === 'number') \n    ? element.position.x \n    : 100 + (index % 3) * 420;\n  const y = (element.position && typeof element.position.y === 'number') \n    ? element.position.y \n    : 100 + Math.floor(index / 3) * 220;\n  \n  let color = (element.color || 'yellow').toLowerCase();\n  if (!validColors.includes(color)) {\n    color = 'yellow';\n  }\n  \n  return {\n    boardId,\n    title: element.title || '',\n    content: element.content || element.title || '',\n    color,\n    x,\n    y,\n    category: element.category || 'general'\n  };\n});"
      },
      "id": "prepare-ai-elements",
      "name": "Prepare AI Elements",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1100, 400]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://api.miro.com/v2/boards/{{ $json.boardId }}/sticky_notes",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "miroOAuth2Api",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"data\": {\n    \"content\": \"<strong>{{ $json.title }}</strong>\\n\\n{{ $json.content.substring(0, 250) }}\",\n    \"shape\": \"square\"\n  },\n  \"style\": {\n    \"fillColor\": \"{{ $json.color }}\",\n    \"textAlign\": \"left\",\n    \"textAlignVertical\": \"top\"\n  },\n  \"position\": {\n    \"x\": {{ $json.x }},\n    \"y\": {{ $json.y }}\n  },\n  \"geometry\": {\n    \"width\": 380,\n    \"height\": 180\n  }\n}",
        "options": {}
      },
      "id": "add-ai-stickies",
      "name": "Add AI Stickies",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [1320, 400]
    },
    {
      "parameters": {
        "jsCode": "// Prepare MoSCoW Headers v2.1.0\nconst boardId = $node['Create Miro Board'].json.id;\nconst frameId = $node['Create MoSCoW Frame'].json.id;\n\nconst columns = [\n  { title: 'MUST HAVE', color: 'red', x: 100 },\n  { title: 'SHOULD HAVE', color: 'yellow', x: 550 },\n  { title: 'COULD HAVE', color: 'green', x: 1000 },\n  { title: 'WON\\'T HAVE', color: 'gray', x: 1450 }\n];\n\nreturn columns.map(col => ({\n  boardId,\n  frameId,\n  title: col.title,\n  color: col.color,\n  x: col.x,\n  y: 50\n}));"
      },
      "id": "prepare-moscow-headers",
      "name": "Prepare MoSCoW Headers",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1100, 700]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://api.miro.com/v2/boards/{{ $json.boardId }}/sticky_notes",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "miroOAuth2Api",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"data\": {\n    \"content\": \"<strong>{{ $json.title }}</strong>\",\n    \"shape\": \"rectangle\"\n  },\n  \"style\": {\n    \"fillColor\": \"{{ $json.color }}\",\n    \"textAlign\": \"center\",\n    \"textAlignVertical\": \"middle\"\n  },\n  \"position\": {\n    \"x\": {{ $json.x }},\n    \"y\": {{ $json.y }}\n  },\n  \"geometry\": {\n    \"width\": 380,\n    \"height\": 80\n  },\n  \"parent\": {\n    \"id\": \"{{ $json.frameId }}\"\n  }\n}",
        "options": {}
      },
      "id": "add-moscow-headers",
      "name": "Add MoSCoW Headers",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [1320, 700]
    },
    {
      "parameters": {
        "jsCode": "// Prepare Response v2.1.0\nconst boardId = $node['Create Miro Board'].json.id;\nconst viewLink = $node['Create Miro Board'].json.viewLink;\nconst projectId = $node['Parse Input'].json.projectId;\nconst aiElements = $node['Parse Input'].json.aiElements || [];\n\nreturn {\n  success: true,\n  board_id: boardId,\n  board_url: viewLink,\n  project_id: projectId,\n  elements_created: aiElements.length,\n  status: 'board_ready',\n  version: '2.1.0'\n};"
      },
      "id": "prepare-response",
      "name": "Prepare Response",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1540, 400]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ JSON.stringify($json) }}",
        "options": {}
      },
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
    "Create MoSCoW Frame": {"main": [[{"node": "Prepare MoSCoW Headers", "type": "main", "index": 0}, {"node": "Prepare AI Elements", "type": "main", "index": 0}]]},
    "Prepare Company Data": {"main": [[{"node": "Add Company Sticky", "type": "main", "index": 0}]]},
    "Add Company Sticky": {"main": [[{"node": "Prepare Response", "type": "main", "index": 0}]]},
    "Prepare AI Elements": {"main": [[{"node": "Add AI Stickies", "type": "main", "index": 0}]]},
    "Add AI Stickies": {"main": [[{"node": "Prepare Response", "type": "main", "index": 0}]]},
    "Prepare MoSCoW Headers": {"main": [[{"node": "Add MoSCoW Headers", "type": "main", "index": 0}]]},
    "Add MoSCoW Headers": {"main": [[{"node": "Prepare Response", "type": "main", "index": 0}]]},
    "Prepare Response": {"main": [[{"node": "Respond Success", "type": "main", "index": 0}]]}
  },
  "settings": {"executionOrder": "v1"},
  "tags": [{"name": "workshop"}, {"name": "miro"}, {"name": "appbuilder"}, {"name": "ai"}, {"name": "v2.1.0"}]
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

-- Also update the v2 template to mark as superseded
UPDATE workflow_templates
SET 
  description = description || ' (Superseded by v2.1.0)',
  is_active = false
WHERE key = 'prepare-miro-workshop-v2' AND version = '2.0.0';


