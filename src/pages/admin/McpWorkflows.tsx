import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAdminRole } from '@/modules/core/user';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useTenantContext';
import {
  listWorkflows,
  upsertWorkflowMap,
  deactivateWorkflowMap,
  resolveWebhook,
} from '@/modules/core/mcp/services/tenantWorkflowService';
import { getTenantSecrets, setTenantSecrets } from '@/modules/core/integrations/services/tenantSecrets';
import { workflowMappingSchema } from '@/modules/core/mcp/validation/schemas';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ExternalLink, Info, KeyRound } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export default function McpWorkflows() {
  const { isAdmin, isLoading: isLoadingRole } = useAdminRole();
  const tenantContext = useTenantContext();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    workflow_key: '',
    webhook_path: '',
    description: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [testKey, setTestKey] = useState('');
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [secretsOpen, setSecretsOpen] = useState(false);
  const [isTestingTrigger, setIsTestingTrigger] = useState(false);
  const [secrets, setSecrets] = useState({
    N8N_MCP_BASE_URL: '',
    N8N_MCP_API_KEY: '',
    N8N_MCP_SIGNING_SECRET: '',
  });

  const tenantId = tenantContext?.tenant_id;

  const { data: workflows, isLoading } = useQuery({
    queryKey: ['mcp-workflows', tenantId],
    queryFn: () => {
      if (!tenantId) throw new Error('No tenant ID');
      return listWorkflows(tenantId);
    },
    enabled: !!tenantId,
  });

  const { data: existingSecrets, isLoading: isLoadingSecrets } = useQuery({
    queryKey: ['mcp-secrets', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant ID');
      const data = await getTenantSecrets(tenantId, 'n8n');
      setSecrets({
        N8N_MCP_BASE_URL: data.N8N_MCP_BASE_URL || '',
        N8N_MCP_API_KEY: data.N8N_MCP_API_KEY || '',
        N8N_MCP_SIGNING_SECRET: data.N8N_MCP_SIGNING_SECRET || '',
      });
      return data;
    },
    enabled: !!tenantId,
  });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant ID');
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      return upsertWorkflowMap(tenantId, {
        ...formData,
        created_by: user.data.user.id,
      });
    },
    onSuccess: () => {
      toast.success('Workflow mapping saved');
      queryClient.invalidateQueries({ queryKey: ['mcp-workflows'] });
      setIsAddDialogOpen(false);
      setFormData({ workflow_key: '', webhook_path: '', description: '' });
      setFormErrors({});
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => {
      if (!tenantId) throw new Error('No tenant ID');
      return deactivateWorkflowMap(id, tenantId);
    },
    onSuccess: () => {
      toast.success('Workflow deactivated');
      queryClient.invalidateQueries({ queryKey: ['mcp-workflows'] });
    },
    onError: (error) => {
      toast.error(`Failed to deactivate: ${error.message}`);
    },
  });

  const saveSecretsMutation = useMutation({
    mutationFn: () => {
      if (!tenantId) throw new Error('No tenant ID');
      return setTenantSecrets(tenantId, 'n8n', secrets);
    },
    onSuccess: () => {
      toast.success('n8n secrets saved');
      queryClient.invalidateQueries({ queryKey: ['mcp-secrets'] });
      setSecretsOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to save secrets: ${error.message}`);
    },
  });

  const handleValidateForm = () => {
    try {
      workflowMappingSchema.parse(formData);
      setFormErrors({});
      return true;
    } catch (error: any) {
      const errors: Record<string, string> = {};
      error.errors?.forEach((err: any) => {
        errors[err.path[0]] = err.message;
      });
      setFormErrors(errors);
      return false;
    }
  };

  const handleSubmit = () => {
    if (handleValidateForm()) {
      upsertMutation.mutate();
    }
  };

  const handleTestResolve = async () => {
    if (!tenantId) {
      toast.error('No tenant context available');
      return;
    }
    if (!testKey) {
      toast.error('Enter a workflow key to test');
      return;
    }

    const url = await resolveWebhook(tenantId, 'n8n', testKey);
    setResolvedUrl(url);

    if (url) {
      toast.success('Webhook resolved successfully');
    } else {
      toast.error('No mapping found for this workflow key');
    }
  };

  const handleTestTrigger = async () => {
    if (!tenantId) {
      toast.error('No tenant context available');
      return;
    }
    if (!testKey) {
      toast.error('Enter a workflow key to test');
      return;
    }

    setIsTestingTrigger(true);
    try {
      // Call edge function with tenant ID from context
      const { data, error } = await supabase.functions.invoke('trigger-n8n-workflow', {
        body: {
          tenantId: tenantId,
          workflowKey: testKey,
          action: 'test_trigger',
          input: {
            test: true,
            timestamp: new Date().toISOString(),
            message: 'Test trigger from MCP Workflows admin',
          },
        },
      });

      if (error) {
        toast.error(`Failed to trigger workflow: ${error.message}`);
        console.error('Trigger error:', error);
        return;
      }

      if (data?.success) {
        toast.success(`Workflow triggered! Run ID: ${data.runId}`);
        console.log('Workflow response:', data);
      } else {
        toast.error(data?.error || 'Unknown error');
        console.error('Workflow error:', data);
      }
    } catch (error: any) {
      toast.error(`Failed to trigger workflow: ${error.message}`);
      console.error('Trigger error:', error);
    } finally {
      setIsTestingTrigger(false);
    }
  };

  if (isLoadingRole || !tenantContext) {
    return <div className="p-8">Loading...</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!tenantId) {
    return (
      <div className="p-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No tenant context found. Please make sure you're logged in and associated with a tenant.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="w-full px-4 lg:px-6 xl:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">n8n Workflow Mappings</h1>
        <p className="text-muted-foreground">
          Configure workflow routing for integration triggers
        </p>
      </div>

      {/* n8n Secrets Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                n8n Configuration
              </CardTitle>
              <CardDescription>
                Configure n8n base URL, API key, and HMAC signing secret
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Collapsible open={secretsOpen} onOpenChange={setSecretsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full">
                {secretsOpen ? 'Hide' : 'Show'} Secrets Configuration
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              {isLoadingSecrets ? (
                <p className="text-sm text-muted-foreground">Loading secrets...</p>
              ) : (
                <>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Hvorfor dele opp URL?</strong><br />
                      • Base URL er felles for alle workflows på samme instans (f.eks. n8n, Pipedream)<br />
                      • Hvis du har 10 workflows, lagrer du base URL ÉN gang i stedet for 10 ganger<br />
                      • Enklere å bytte instans senere - endre base URL ett sted<br />
                      • API keys og secrets følger instansen, ikke individuelle webhooks
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="base_url">n8n Base URL *</Label>
                    <Input
                      id="base_url"
                      placeholder="https://jardam.app.n8n.cloud"
                      value={secrets.N8N_MCP_BASE_URL}
                      onChange={(e) =>
                        setSecrets({ ...secrets, N8N_MCP_BASE_URL: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Eksempel: Fra full URL <code className="text-xs">https://jardam.app.n8n.cloud/webhook/abc-123</code><br />
                      → Base URL er: <code className="text-xs">https://jardam.app.n8n.cloud</code>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="api_key">n8n API Key (optional)</Label>
                    <Input
                      id="api_key"
                      type="password"
                      placeholder="n8n-api-key-..."
                      value={secrets.N8N_MCP_API_KEY}
                      onChange={(e) =>
                        setSecrets({ ...secrets, N8N_MCP_API_KEY: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Valgfritt, brukes for direkte n8n API-kall
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signing_secret">HMAC Signing Secret (optional)</Label>
                    <Input
                      id="signing_secret"
                      type="password"
                      placeholder="generer-en-sterk-secret..."
                      value={secrets.N8N_MCP_SIGNING_SECRET}
                      onChange={(e) =>
                        setSecrets({ ...secrets, N8N_MCP_SIGNING_SECRET: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      HMAC secret for å signere webhook requests (anbefalt)
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      onClick={() => saveSecretsMutation.mutate()}
                      disabled={saveSecretsMutation.isPending || !secrets.N8N_MCP_BASE_URL}
                    >
                      Save Secrets
                    </Button>
                  </div>
                </>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Test Resolution */}
      <Card>
        <CardHeader>
          <CardTitle>Test Workflow Resolution</CardTitle>
          <CardDescription>
            Check what URL a workflow key resolves to
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="workflow_key (e.g. mcp-test)"
              value={testKey}
              onChange={(e) => setTestKey(e.target.value)}
            />
            <Button onClick={handleTestResolve} variant="outline">
              Resolve
            </Button>
            <Button 
              onClick={handleTestTrigger} 
              disabled={isTestingTrigger || !testKey}
              className="min-w-[120px]"
            >
              {isTestingTrigger ? 'Triggering...' : 'Test Trigger'}
            </Button>
          </div>
          {resolvedUrl && (
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <p className="text-xs text-muted-foreground">Resolved URL:</p>
              <p className="text-sm font-mono break-all">{resolvedUrl}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workflow Mappings List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Workflow Mappings</CardTitle>
            <CardDescription>Active and inactive workflow configurations</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>Add Mapping</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add/Edit Workflow Mapping</DialogTitle>
                <DialogDescription>
                  Del webhook URL i to deler: Base URL lagres i secrets-seksjonen, webhook path lagres her
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Eksempel:</strong> Full URL fra n8n:<br />
                    <code>https://jardam.app.n8n.cloud/mcp-test/c816ea1e-9fc5-4de4-a0d2-3fcec1c9c7cb</code><br />
                    → Base URL (sett i secrets): <code>https://jardam.app.n8n.cloud</code><br />
                    → Webhook Path (sett her): <code>/mcp-test/c816ea1e-9fc5-4de4-a0d2-3fcec1c9c7cb</code>
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="workflow_key">Workflow Key</Label>
                  <Input
                    id="workflow_key"
                    placeholder="send_gmail_on_project_create"
                    value={formData.workflow_key}
                    onChange={(e) =>
                      setFormData({ ...formData, workflow_key: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Beskrivende nøkkel for workflow (brukes i kode)
                  </p>
                  {formErrors.workflow_key && (
                    <p className="text-xs text-destructive">{formErrors.workflow_key}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhook_path">Webhook Path</Label>
                  <Input
                    id="webhook_path"
                    placeholder="/mcp-test/c816ea1e-9fc5-4de4-a0d2-3fcec1c9c7cb"
                    value={formData.webhook_path}
                    onChange={(e) =>
                      setFormData({ ...formData, webhook_path: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Path-delen av webhook URL (hele path inkl. UUID fra n8n)
                  </p>
                  {formErrors.webhook_path && (
                    <p className="text-xs text-destructive">{formErrors.webhook_path}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="What this workflow does..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={upsertMutation.isPending}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : workflows && workflows.length > 0 ? (
            <div className="space-y-2">
              {workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">
                        {workflow.workflow_key}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {workflow.provider}
                      </Badge>
                      {workflow.is_active ? (
                        <Badge variant="default" className="text-xs">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-mono text-muted-foreground">
                      {workflow.webhook_path}
                    </p>
                    {workflow.description && (
                      <p className="text-sm text-muted-foreground">
                        {workflow.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Updated: {new Date(workflow.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {workflow.is_active && (
                      <Button
                        onClick={() => deactivateMutation.mutate(workflow.id)}
                        variant="outline"
                        size="sm"
                        disabled={deactivateMutation.isPending}
                      >
                        Deactivate
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No workflow mappings yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
