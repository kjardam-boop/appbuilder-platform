/**
 * Setup n8n Workflows Edge Function
 * 
 * Creates workshop workflows in n8n via REST API
 * 
 * Usage:
 * POST /functions/v1/setup-n8n-workflows
 * Body: { tenantId: "uuid" }
 * 
 * Requires:
 * - N8N_API_URL environment variable
 * - N8N_API_KEY environment variable
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Workflow templates (simplified for API creation)
const WORKFLOW_TEMPLATES = {
  'prepare-miro-workshop': {
    name: 'Prepare Miro Workshop Board',
    nodes: [
      {
        parameters: {
          httpMethod: 'POST',
          path: 'prepare-miro-workshop',
          responseMode: 'responseNode',
          options: {}
        },
        id: 'webhook',
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [0, 300],
        webhookId: 'prepare-miro-workshop'
      },
      {
        parameters: {
          jsCode: `// Extract input and prepare for Miro board creation
const input = $input.first().json;
const projectId = input.body?.input?.project_id;
const companyId = input.body?.input?.company_id;
const systems = input.body?.input?.systems || [];
const questionnaire = input.body?.input?.questionnaire || {};
const context = input.body?.context || {};

if (!projectId) {
  throw new Error('project_id is required');
}

// For now, return a mock response
// In production, this would call Miro API
return {
  projectId,
  companyId,
  systems,
  questionnaire,
  tenantId: context.tenant_id,
  userId: context.user_id,
  requestId: context.request_id,
  // Mock board data - replace with actual Miro API calls
  boardId: 'mock_board_' + Date.now(),
  boardUrl: 'https://miro.com/app/board/mock_' + Date.now()
};`
        },
        id: 'process',
        name: 'Process Input',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [220, 300]
      },
      {
        parameters: {
          respondWith: 'json',
          responseBody: `={
  "success": true,
  "board_id": "{{ $json.boardId }}",
  "board_url": "{{ $json.boardUrl }}",
  "project_id": "{{ $json.projectId }}",
  "status": "board_ready",
  "message": "Workshop board created. Connect Miro API to fully populate."
}`,
          options: {}
        },
        id: 'respond',
        name: 'Respond',
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1.1,
        position: [440, 300]
      }
    ],
    connections: {
      'Webhook': {
        main: [[{ node: 'Process Input', type: 'main', index: 0 }]]
      },
      'Process Input': {
        main: [[{ node: 'Respond', type: 'main', index: 0 }]]
      }
    },
    settings: { executionOrder: 'v1' }
  },
  'process-workshop-results': {
    name: 'Process Workshop Results',
    nodes: [
      {
        parameters: {
          httpMethod: 'POST',
          path: 'process-workshop-results',
          responseMode: 'responseNode',
          options: {}
        },
        id: 'webhook',
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [0, 300],
        webhookId: 'process-workshop-results'
      },
      {
        parameters: {
          jsCode: `// Extract input and process workshop results
const input = $input.first().json;
const projectId = input.body?.input?.project_id;
const context = input.body?.context || {};

if (!projectId) {
  throw new Error('project_id is required');
}

// For now, return a mock response
// In production, this would:
// 1. Fetch items from Miro board
// 2. Categorize and analyze with AI
// 3. Create Notion documentation
return {
  projectId,
  tenantId: context.tenant_id,
  userId: context.user_id,
  // Mock results - replace with actual processing
  notionUrl: 'https://notion.so/mock_page_' + Date.now(),
  summary: {
    pain_points_count: 5,
    must_have_count: 8,
    user_stories_count: 12
  }
};`
        },
        id: 'process',
        name: 'Process Input',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [220, 300]
      },
      {
        parameters: {
          respondWith: 'json',
          responseBody: `={
  "success": true,
  "project_id": "{{ $json.projectId }}",
  "notion_url": "{{ $json.notionUrl }}",
  "summary": {{ JSON.stringify($json.summary) }},
  "status": "processed",
  "message": "Workshop results processed. Connect Miro/Notion APIs for full integration."
}`,
          options: {}
        },
        id: 'respond',
        name: 'Respond',
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1.1,
        position: [440, 300]
      }
    ],
    connections: {
      'Webhook': {
        main: [[{ node: 'Process Input', type: 'main', index: 0 }]]
      },
      'Process Input': {
        main: [[{ node: 'Respond', type: 'main', index: 0 }]]
      }
    },
    settings: { executionOrder: 'v1' }
  }
};

interface SetupRequest {
  tenantId: string;
  n8nApiUrl?: string;
  n8nApiKey?: string;
}

async function createWorkflow(
  n8nApiUrl: string,
  n8nApiKey: string,
  workflowKey: string,
  template: any
): Promise<{ id: string; name: string; webhookPath: string } | null> {
  try {
    const response = await fetch(`${n8nApiUrl}/rest/workflows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey,
      },
      body: JSON.stringify(template),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to create workflow ${workflowKey}:`, error);
      return null;
    }

    const workflow = await response.json();

    // Activate the workflow
    await fetch(`${n8nApiUrl}/rest/workflows/${workflow.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey,
      },
      body: JSON.stringify({ active: true }),
    });

    return {
      id: workflow.id,
      name: workflow.name,
      webhookPath: `/webhook/${workflowKey}`,
    };
  } catch (error) {
    console.error(`Error creating workflow ${workflowKey}:`, error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const body: SetupRequest = await req.json();
    const { tenantId, n8nApiUrl, n8nApiKey } = body;

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'tenantId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get n8n config from environment or request
    const apiUrl = n8nApiUrl || Deno.env.get('N8N_API_URL');
    const apiKey = n8nApiKey || Deno.env.get('N8N_API_KEY');

    if (!apiUrl || !apiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'n8n API credentials not configured',
          message: 'Please provide n8nApiUrl and n8nApiKey in the request body, or set N8N_API_URL and N8N_API_KEY environment variables'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: Record<string, any> = {};
    const workflowMappings: any[] = [];

    // Create each workflow
    for (const [workflowKey, template] of Object.entries(WORKFLOW_TEMPLATES)) {
      console.log(`Creating workflow: ${workflowKey}`);
      const result = await createWorkflow(apiUrl, apiKey, workflowKey, template);
      
      if (result) {
        results[workflowKey] = {
          success: true,
          workflowId: result.id,
          name: result.name,
          webhookPath: result.webhookPath,
        };

        workflowMappings.push({
          tenant_id: tenantId,
          provider: 'n8n',
          workflow_key: workflowKey,
          webhook_path: result.webhookPath,
          is_active: true,
        });
      } else {
        results[workflowKey] = {
          success: false,
          error: 'Failed to create workflow',
        };
      }
    }

    // Save workflow mappings to database
    if (workflowMappings.length > 0) {
      const { error: mappingError } = await supabaseClient
        .from('n8n_workflow_mappings')
        .upsert(workflowMappings, {
          onConflict: 'tenant_id,provider,workflow_key',
        });

      if (mappingError) {
        console.error('Failed to save workflow mappings:', mappingError);
      }
    }

    // Save n8n integration config
    const { error: integrationError } = await supabaseClient
      .from('tenant_integrations')
      .upsert({
        tenant_id: tenantId,
        adapter_id: 'n8n',
        config: { n8n_base_url: apiUrl },
        is_active: true,
      }, {
        onConflict: 'tenant_id,adapter_id',
      });

    if (integrationError) {
      console.error('Failed to save n8n integration:', integrationError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        workflows: results,
        message: 'Workshop workflows created. Import the full workflow JSON files for complete Miro/Notion integration.',
        nextSteps: [
          '1. Go to n8n and open each workflow',
          '2. Import the full workflow from docs/n8n-workflows/',
          '3. Configure Miro and Notion credentials',
          '4. Test the webhooks',
        ],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Setup error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

