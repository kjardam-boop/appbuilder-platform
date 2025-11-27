# n8n Workshop Workflows

This folder contains n8n workflow templates for the App Creation Wizard's Miro/Notion integration.

## Workflows

### 1. `prepare-miro-workshop.json`
Creates a pre-populated Miro board for discovery workshops.

**Webhook:** `POST /webhook/prepare-miro-workshop`

**Input:**
```json
{
  "context": {
    "tenant_id": "uuid",
    "user_id": "uuid",
    "request_id": "uuid"
  },
  "action": "prepare",
  "input": {
    "project_id": "uuid",
    "company_id": "uuid",
    "systems": [{ "id": "uuid", "name": "string", "type": "string" }],
    "questionnaire": { "q1": "answer1", "q2": "answer2" }
  }
}
```

**Output:**
```json
{
  "success": true,
  "board_id": "miro_board_id",
  "board_url": "https://miro.com/app/board/...",
  "project_id": "uuid",
  "status": "board_ready"
}
```

**What it does:**
1. Fetches project and company data from Supabase
2. Creates a new Miro board with 5 frames:
   - Company Context
   - Current Systems
   - Discovery Insights
   - Process Mapping
   - Solution Ideation (MoSCoW)
3. Populates frames with:
   - Company info sticky note
   - System cards (color-coded by type)
   - Discovery insights (categorized by sentiment)
   - MoSCoW column headers
4. Updates project with board URL

---

### 2. `process-workshop-results.json`
Extracts data from completed Miro workshop, summarizes with AI, creates Notion documentation.

**Webhook:** `POST /webhook/process-workshop-results`

**Input:**
```json
{
  "context": {
    "tenant_id": "uuid",
    "user_id": "uuid",
    "request_id": "uuid"
  },
  "action": "process",
  "input": {
    "project_id": "uuid"
  }
}
```

**Output:**
```json
{
  "success": true,
  "project_id": "uuid",
  "notion_url": "https://notion.so/...",
  "summary": {
    "pain_points_count": 5,
    "must_have_count": 8,
    "user_stories_count": 12
  },
  "status": "processed"
}
```

**What it does:**
1. Fetches project info and Miro board ID
2. Retrieves all items from Miro board via API
3. Categorizes items:
   - Pain points (red sticky notes)
   - Requirements (MoSCoW by color)
   - User stories (detects "As a..." pattern)
   - Process flows (from connectors)
4. Sends to GPT-4 for intelligent summarization
5. Creates structured Notion page with:
   - Executive summary
   - Pain points list
   - MoSCoW requirements
   - Technical architecture notes
   - Link to Miro board
6. Stores results in `project_workshop_results` table
7. Updates project status to "processed"

---

## Setup Instructions

### Step 1: Import Workflows

1. Go to your n8n instance
2. Click **Workflows** → **Import from File**
3. Upload each `.json` file
4. Or use the n8n REST API:

```bash
# Import workflow via API
curl -X POST "https://your-n8n-instance/rest/workflows" \
  -H "X-N8N-API-KEY: your-api-key" \
  -H "Content-Type: application/json" \
  -d @prepare-miro-workshop.json
```

### Step 2: Configure Credentials

You need to create these credentials in n8n:

#### Supabase Postgres
- **Type:** Postgres
- **Host:** `db.reprtgtkvecrsngkgpaw.supabase.co`
- **Database:** `postgres`
- **User:** `postgres.reprtgtkvecrsngkgpaw`
- **Password:** Your database password
- **Port:** `5432`
- **SSL:** `require`

#### Miro API
- **Type:** Header Auth
- **Name:** `Authorization`
- **Value:** `Bearer YOUR_MIRO_ACCESS_TOKEN`

Get your Miro token:
1. Go to https://miro.com/app/settings/user-profile/apps
2. Create a new app or use existing
3. Generate an access token with scopes:
   - `boards:read`
   - `boards:write`
   - `team:read`

#### Notion API
- **Type:** Header Auth
- **Name:** `Authorization`
- **Value:** `Bearer YOUR_NOTION_API_KEY`

Get your Notion token:
1. Go to https://www.notion.so/my-integrations
2. Create a new integration
3. Copy the Internal Integration Token
4. Share your target database with the integration

#### OpenAI API
- **Type:** OpenAI API
- **API Key:** Your OpenAI API key

### Step 3: Set Environment Variables

In n8n, set these environment variables:

```bash
MIRO_TEAM_ID=your-miro-team-id
NOTION_PROJECTS_DB=your-notion-database-id
```

### Step 4: Update Credential IDs

In each workflow, replace placeholder credential IDs:
- `SUPABASE_POSTGRES_CREDENTIAL_ID` → Your actual Postgres credential ID
- `MIRO_API_CREDENTIAL_ID` → Your actual Miro credential ID
- `NOTION_API_CREDENTIAL_ID` → Your actual Notion credential ID
- `OPENAI_CREDENTIAL_ID` → Your actual OpenAI credential ID

### Step 5: Configure Tenant Integration

In your Supabase database, add entries to `mcp_tenant_workflow_map`:

```sql
INSERT INTO mcp_tenant_workflow_map (tenant_id, provider, workflow_key, webhook_path, is_active)
VALUES 
  ('YOUR_TENANT_ID', 'n8n', 'prepare-miro-workshop', '/webhook/prepare-miro-workshop', true),
  ('YOUR_TENANT_ID', 'n8n', 'process-workshop-results', '/webhook/process-workshop-results', true);
```

Add n8n integration config to `tenant_integrations`:

```sql
INSERT INTO tenant_integrations (tenant_id, adapter_id, config, is_active)
VALUES (
  'YOUR_TENANT_ID',
  'n8n',
  '{"n8n_base_url": "https://your-n8n-instance.com"}',
  true
);
```

### Step 6: Activate Workflows

After importing and configuring:
1. Open each workflow in n8n
2. Click the toggle to activate
3. Test the webhook URL

---

## Testing

### Test Prepare Workshop

```bash
curl -X POST "https://your-n8n-instance.com/webhook/prepare-miro-workshop" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: YOUR_TENANT_ID" \
  -d '{
    "context": {
      "tenant_id": "YOUR_TENANT_ID",
      "user_id": "YOUR_USER_ID",
      "request_id": "test-123"
    },
    "action": "prepare",
    "input": {
      "project_id": "YOUR_PROJECT_ID"
    }
  }'
```

### Test Process Results

```bash
curl -X POST "https://your-n8n-instance.com/webhook/process-workshop-results" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: YOUR_TENANT_ID" \
  -d '{
    "context": {
      "tenant_id": "YOUR_TENANT_ID",
      "user_id": "YOUR_USER_ID",
      "request_id": "test-456"
    },
    "action": "process",
    "input": {
      "project_id": "YOUR_PROJECT_ID"
    }
  }'
```

---

## Customization

### Miro Board Template

To customize the board layout, modify the frame positions and sizes in the "Create *Frame" nodes.

Frame layout:
```
┌─────────────────────────────────────────────────────┐
│  Frame 1: Context     │  Frame 2: Systems          │
│  (0,0) 1200x800       │  (1400,0) 1600x800         │
├───────────────────────┴────────────────────────────┤
│  Frame 3: Discovery Insights                        │
│  (0,1000) 2000x800                                  │
├────────────────────────────────────────────────────┤
│  Frame 4: Process Mapping                           │
│  (0,2000) 2400x1200                                 │
├────────────────────────────────────────────────────┤
│  Frame 5: Solution Ideation (MoSCoW)                │
│  (0,3400) 2000x1000                                 │
└────────────────────────────────────────────────────┘
```

### Sticky Note Colors

The workflows use Miro's color names:
- `red` - Pain points / Must Have
- `yellow` - Should Have
- `green` - Could Have / Goals
- `gray` - Won't Have
- `light_blue` - Needs / Company info
- `orange` - Risks
- `violet` - Constraints

### Notion Page Structure

The Notion page is created with:
- Title: "{Company} - {Project} Spec"
- Status property: "Workshop Complete"
- Sections: Executive Summary, Pain Points, Requirements, Technical Architecture, Workshop References

Customize by modifying the JSON body in the "Create Notion Documentation" node.

---

## Troubleshooting

### "Workflow not found" error
- Check that the workflow is activated in n8n
- Verify the webhook path matches `mcp_tenant_workflow_map`
- Ensure tenant has n8n integration configured

### Miro API errors
- Verify Miro token has correct scopes
- Check team ID is correct
- Ensure you have permissions to create boards in the team

### Notion API errors
- Verify the integration is shared with the target database
- Check database ID is correct (not the page ID)
- Ensure required properties exist in the database schema

### AI summarization fails
- Check OpenAI API key is valid
- Ensure model (gpt-4) is available on your account
- Verify workshop has enough content to summarize

