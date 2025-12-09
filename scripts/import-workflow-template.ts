#!/usr/bin/env npx ts-node
/**
 * Import Workflow Template Script
 * 
 * Reads a workflow JSON file from docs/n8n-workflows/ and upserts it into
 * the integration_definitions table with type='workflow'.
 * 
 * Usage:
 *   npm run import:workflow docs/n8n-workflows/prepare-miro-workshop-v2.3.0.json
 *   npx ts-node scripts/import-workflow-template.ts docs/n8n-workflows/prepare-miro-workshop-v2.3.0.json
 * 
 * The JSON file should have:
 *   - name: Human-readable name (version will be stripped for storage)
 *   - version: Semantic version (e.g., "2.3.0")
 *   - changelog: Description of changes (optional)
 *   - nodes: Array of n8n nodes
 *   - connections: Connection mappings
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file manually
function loadEnv(envPath: string): Record<string, string> {
  const env: Record<string, string> = {};
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex > 0) {
          const key = trimmed.substring(0, eqIndex).trim();
          let value = trimmed.substring(eqIndex + 1).trim();
          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          env[key] = value;
        }
      }
    }
  }
  return env;
}

const envPath = path.join(__dirname, '../.env');
const localEnv = loadEnv(envPath);

const SUPABASE_URL = localEnv.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// Try service key first, fall back to anon key (may have RLS restrictions)
const SUPABASE_KEY = localEnv.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  localEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY as fallback)');
  console.error('');
  console.error('💡 For best results, add SUPABASE_SERVICE_ROLE_KEY to .env:');
  console.error('   Get it from Supabase Dashboard → Settings → API → service_role key');
  process.exit(1);
}

const isServiceKey = SUPABASE_KEY.includes('service_role') || 
  (localEnv.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) === SUPABASE_KEY;

if (!isServiceKey) {
  console.log('⚠️  Using anon key - may have RLS restrictions. Add SUPABASE_SERVICE_ROLE_KEY to .env for full access.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface WorkflowJson {
  name: string;
  version?: string;
  changelog?: string;
  nodes: any[];
  connections: Record<string, any>;
  settings?: any;
  tags?: Array<{ name: string }>;
}

function extractKeyFromFilename(filename: string): string {
  // Extract key from filename like "prepare-miro-workshop-v2.3.0.json"
  const basename = path.basename(filename, '.json');
  // Remove version suffix (e.g., -v2.3.0)
  return basename.replace(/-v\d+\.\d+\.\d+$/, '');
}

function extractVersionFromFilename(filename: string): string | null {
  const match = filename.match(/-v(\d+\.\d+\.\d+)\.json$/);
  return match ? match[1] : null;
}

function cleanNameForStorage(name: string): string {
  // Remove version suffix from name (e.g., "Prepare Miro Workshop Board v2.3.0" -> "Prepare Miro Workshop Board")
  return name.replace(/ v\d+\.\d+\.\d+$/, '');
}

function extractWebhookPath(workflowJson: WorkflowJson): string | null {
  // Find webhook trigger node and extract path
  const webhookNode = workflowJson.nodes.find(
    (n: any) => n.type === 'n8n-nodes-base.webhook'
  );
  
  if (webhookNode?.parameters?.path) {
    return `/webhook/${webhookNode.parameters.path}`;
  }
  
  return null;
}

function extractTags(workflowJson: WorkflowJson): string[] {
  const tags = ['workflow'];
  
  // Extract from tags array
  if (workflowJson.tags) {
    for (const tag of workflowJson.tags) {
      if (tag.name && !tags.includes(tag.name)) {
        tags.push(tag.name);
      }
    }
  }
  
  // Add version tag
  if (workflowJson.version) {
    tags.push(`v${workflowJson.version}`);
  }
  
  return tags;
}

async function importWorkflow(filePath: string) {
  console.log(`\n📥 Importing workflow from: ${filePath}\n`);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }
  
  // Read and parse JSON
  let workflowJson: WorkflowJson;
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    workflowJson = JSON.parse(fileContent);
  } catch (error) {
    console.error('❌ Failed to parse JSON:', (error as Error).message);
    process.exit(1);
  }
  
  // Validate required fields
  if (!workflowJson.nodes || !Array.isArray(workflowJson.nodes)) {
    console.error('❌ Invalid workflow: missing "nodes" array');
    process.exit(1);
  }
  
  if (!workflowJson.connections) {
    console.error('❌ Invalid workflow: missing "connections" object');
    process.exit(1);
  }
  
  // Extract metadata
  const key = extractKeyFromFilename(filePath);
  const version = workflowJson.version || extractVersionFromFilename(filePath) || '1.0.0';
  const name = cleanNameForStorage(workflowJson.name || key);
  const changelog = workflowJson.changelog || null;
  const webhookPath = extractWebhookPath(workflowJson);
  const tags = extractTags(workflowJson);
  
  console.log('📋 Workflow Metadata:');
  console.log(`   Key:         ${key}`);
  console.log(`   Name:        ${name}`);
  console.log(`   Version:     ${version}`);
  console.log(`   Webhook:     ${webhookPath || '(none)'}`);
  console.log(`   Changelog:   ${changelog ? changelog.substring(0, 50) + '...' : '(none)'}`);
  console.log(`   Tags:        ${tags.join(', ')}`);
  console.log(`   Nodes:       ${workflowJson.nodes.length}`);
  console.log('');
  
  // Build description
  const description = changelog 
    ? `${changelog}`
    : `n8n workflow template (v${version})`;
  
  // Upsert into integration_definitions
  // Build the data object - include version/changelog only with service key
  const upsertData: Record<string, any> = {
    key,
    name,
    description,
    type: 'workflow',
    icon_name: 'Workflow',
    n8n_webhook_path: webhookPath,
    workflow_json: workflowJson,
    is_active: true,
    requires_credentials: true,
    tags,
    updated_at: new Date().toISOString(),
  };
  
  // Only include these columns if using service key (schema cache issue with anon key)
  if (isServiceKey) {
    upsertData.version = version;
    upsertData.changelog = changelog;
    upsertData.sync_status = 'draft';
  }

  const { data, error } = await supabase
    .from('integration_definitions')
    .upsert(upsertData, {
      onConflict: 'key',
    })
    .select()
    .single();
  
  if (error) {
    console.error('❌ Database error:', error.message);
    if (error.message.includes('schema cache')) {
      console.error('');
      console.error('💡 Schema cache issue. Add SUPABASE_SERVICE_ROLE_KEY to .env:');
      console.error('   Get it from Supabase Dashboard → Settings → API → service_role key');
    }
    process.exit(1);
  }
  
  if (!isServiceKey) {
    console.log('⚠️  Version/changelog not saved (requires service key)');
  }
  
  console.log('✅ Workflow imported successfully!');
  console.log(`   ID:          ${data.id}`);
  console.log(`   Status:      ${data.sync_status}`);
  console.log('');
  console.log('📝 Next steps:');
  console.log(`   1. Go to /admin/integrations?tab=workflows`);
  console.log(`   2. Find "${name}" and click to open`);
  console.log(`   3. Push to n8n or sync from existing workflow`);
  console.log('');
}

// Main
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('');
  console.log('Usage: npm run import:workflow <path-to-json>');
  console.log('');
  console.log('Examples:');
  console.log('  npm run import:workflow docs/n8n-workflows/prepare-miro-workshop-v2.3.0.json');
  console.log('  npx ts-node scripts/import-workflow-template.ts docs/n8n-workflows/my-workflow.json');
  console.log('');
  process.exit(0);
}

const filePath = args[0];
const resolvedPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

importWorkflow(resolvedPath);

