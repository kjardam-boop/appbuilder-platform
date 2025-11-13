#!/usr/bin/env node

/**
 * Migration Runner
 * Applies pending SQL migrations to Supabase database
 * Use this when you don't have Supabase CLI or direct SQL access
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Get Supabase credentials from .env
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials in .env file');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Migrations to apply (in order)
const migrations = [
  {
    name: '20251113073900_ai_app_content_library',
    path: 'supabase/migrations/20251113073900_ai_app_content_library.sql',
    description: 'Create AI content library table with seed data'
  },
  {
    name: '20251113093200_enhance_content_library_storage',
    path: 'supabase/migrations/20251113093200_enhance_content_library_storage.sql',
    description: 'Add file storage support to content library'
  }
];

async function applyMigration(migration) {
  console.log(`\n📦 Applying migration: ${migration.name}`);
  console.log(`   ${migration.description}`);
  
  try {
    // Read migration file
    const migrationPath = join(projectRoot, migration.path);
    const sql = readFileSync(migrationPath, 'utf-8');
    
    // Split into individual statements (handle multi-statement SQL)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`   Found ${statements.length} SQL statements`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.trim().length === 0) {
        continue;
      }
      
      console.log(`   Executing statement ${i + 1}/${statements.length}...`);
      
      const { error } = await supabase.rpc('exec_sql', {
        sql_query: statement
      }).catch(async () => {
        // If exec_sql doesn't exist, try direct query
        return await supabase.from('_migrations').select('*').limit(0);
      });
      
      if (error) {
        // Try alternative: use Supabase's postgrest directly
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ sql_query: statement })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
      }
    }
    
    console.log(`   ✅ Migration applied successfully`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error applying migration:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Supabase Migration Runner');
  console.log('============================\n');
  console.log(`📍 Project: ${projectRoot}`);
  console.log(`🔗 Supabase URL: ${supabaseUrl}\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const migration of migrations) {
    const success = await applyMigration(migration);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log('\n============================');
  console.log(`✅ Successful: ${successCount}`);
  if (failCount > 0) {
    console.log(`❌ Failed: ${failCount}`);
  }
  console.log('============================\n');
  
  if (failCount > 0) {
    console.log('⚠️  Some migrations failed. Please check the errors above.');
    process.exit(1);
  } else {
    console.log('🎉 All migrations applied successfully!');
    console.log('You can now use the Content Library at /admin/content-library');
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
