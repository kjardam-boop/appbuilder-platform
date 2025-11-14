import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { AppBreadcrumbs } from '@/components/ui/app-breadcrumbs';
import { COMMON_BREADCRUMBS } from '@/helpers/breadcrumbHelper';
import { CheckCircle2, XCircle, Loader2, Database } from 'lucide-react';

export default function RunMigrations() {
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const runMigrations = async () => {
    setStatus('running');
    setLogs([]);
    setError(null);

    try {
      addLog('Starting migration process...');

      // Step 1: Check if table already exists
      addLog('Checking if ai_app_content_library table exists...');
      const { data: existingData, error: checkError } = await supabase
        .from('ai_app_content_library')
        .select('id')
        .limit(1);

      if (!checkError) {
        addLog('✅ Table already exists!');
        addLog(`Found ${existingData?.length || 0} existing records`);
        setStatus('success');
        return;
      }

      // Step 2: Create table via SQL (using a migration helper)
      addLog('Table does not exist. Creating via SQL migration...');
      
      // Read the migration file content
      const migration1 = await fetch('/migrations/20251113073900_ai_app_content_library.sql').then(r => r.text());
      const migration2 = await fetch('/migrations/20251113093200_enhance_content_library_storage.sql').then(r => r.text());

      // For Lovable/Supabase, we need to execute this through an Edge Function
      addLog('Calling migration Edge Function...');
      
      const { data: migrationResult, error: migrationError } = await supabase.functions.invoke('run-migrations', {
        body: { migrations: [migration1, migration2] }
      });

      if (migrationError) {
        throw new Error(`Migration function error: ${migrationError.message}`);
      }

      addLog('✅ Migrations executed successfully!');
      addLog(JSON.stringify(migrationResult, null, 2));

      // Step 3: Verify table was created
      addLog('Verifying table creation...');
      const { data: verifyData, error: verifyError } = await supabase
        .from('ai_app_content_library')
        .select('count')
        .limit(1);

      if (verifyError) {
        throw new Error(`Verification failed: ${verifyError.message}`);
      }

      addLog('✅ Table verified successfully!');
      
      // Step 4: Check seed data
      const { data: seedData, error: seedError } = await supabase
        .from('ai_app_content_library')
        .select('id, title')
        .limit(10);

      if (!seedError && seedData) {
        addLog(`✅ Found ${seedData.length} seed records:`);
        seedData.forEach(record => {
          addLog(`  - ${record.title}`);
        });
      }

      setStatus('success');
      addLog('🎉 Migration completed successfully!');

    } catch (err: any) {
      console.error('Migration error:', err);
      setError(err.message || 'Unknown error occurred');
      addLog(`❌ Error: ${err.message}`);
      setStatus('error');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <AppBreadcrumbs levels={COMMON_BREADCRUMBS.migrations()} />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            Database Migrations
          </CardTitle>
          <CardDescription>
            Run pending migrations to create the AI Content Library table
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              This will create the <code className="bg-muted px-1 py-0.5 rounded">ai_app_content_library</code> table
              and insert 3 seed content examples for testing.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button 
              onClick={runMigrations} 
              disabled={status === 'running'}
              className="w-full"
            >
              {status === 'running' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Migrations...
                </>
              ) : (
                'Run Migrations'
              )}
            </Button>
          </div>

          {status === 'success' && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Migrations completed successfully! You can now use the Content Library.
              </AlertDescription>
            </Alert>
          )}

          {status === 'error' && error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Error:</strong> {error}
              </AlertDescription>
            </Alert>
          )}

          {logs.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold mb-2">Migration Log:</h3>
              <div className="bg-muted p-4 rounded-lg font-mono text-xs space-y-1 max-h-96 overflow-y-auto">
                {logs.map((log, idx) => (
                  <div key={idx} className="text-muted-foreground">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-sm text-muted-foreground pt-4 border-t">
            <p className="font-semibold mb-2">What this migration does:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Creates the <code>ai_app_content_library</code> table</li>
              <li>Adds file storage columns for markdown/PDF/DOCX support</li>
              <li>Sets up indexes for fast keyword search</li>
              <li>Configures Row Level Security (RLS) policies</li>
              <li>Inserts 3 example content items</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
