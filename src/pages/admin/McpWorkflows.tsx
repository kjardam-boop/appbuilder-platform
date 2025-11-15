import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useTenantContext';
import { McpIntegrationRunsView } from '@/components/admin/mcp/McpIntegrationRunsView';
import {
  listWorkflows,
  upsertWorkflowMap,
  deactivateWorkflowMap,
  resolveWebhook,
  deleteWorkflowMap,
  updateWorkflowMap,
} from '@/modules/core/mcp/services/tenantWorkflowService';
import { getTenantSecrets, setTenantSecrets } from '@/modules/core/integrations/services/tenantSecrets';
import { setN8nBaseUrl } from '@/modules/core/integrations/services/integrationConfig';
import { workflowMappingSchema } from '@/modules/core/mcp/validation/schemas';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ExternalLink, Info, KeyRound, Pencil, Link as LinkIcon, Trash2, PlayCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AppBreadcrumbs } from '@/components/ui/app-breadcrumbs';
import { generateAdminBreadcrumbs } from '@/helpers/breadcrumbHelper';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export default function McpWorkflows() {
  const { isPlatformAdmin, isLoading: isLoadingRole } = usePlatformAdmin();
  const tenantContext = useTenantContext();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    workflow_key: '',
    webhook_path: '',
    description: '',
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [testKey, setTestKey] = useState('');
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [secretsOpen, setSecretsOpen] = useState(false);
  const [isTestingTrigger, setIsTestingTrigger] = useState(false);
  const [testPayloads, setTestPayloads] = useState<Record<string, string>>({});
  const [secrets, setSecrets] = useState({
    N8N_MCP_BASE_URL: '',
    N8N_MCP_API_KEY: '',
    N8N_MCP_SIGNING_SECRET: '',
  });

  const tenantId = tenantContext?.tenant_id;

  // Check if user can manage workflows (admin privileges)
  const { data: canManage, isLoading: isCheckingPermissions } = useQuery({
    queryKey: ['can-manage-workflows', tenantId],
    queryFn: async () => {
      if (!tenantId) return false;
      const { data, error } = await supabase.rpc('can_manage_workflows', {
        _tenant_id: tenantId
      });
      if (error) {
        console.error('Error checking workflow permissions:', error);
        return false;
      }
      return data as boolean;
    },
    enabled: !!tenantId,
  });

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
        provider: 'n8n',
        created_by: user.data.user.id,
      });
    },
    onSuccess: () => {
      toast.success('Workflow mapping saved');
      queryClient.invalidateQueries({ queryKey: ['mcp-workflows'] });
      setIsAddDialogOpen(false);
      setFormData({ workflow_key: '', webhook_path: '', description: '', is_active: true });
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
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant ID');
      // Save credentials AND mirror base URL into config for edge function resolver
      await Promise.all([
        setTenantSecrets(tenantId, 'n8n', secrets),
        setN8nBaseUrl(tenantId, secrets.N8N_MCP_BASE_URL),
      ]);
    },
    onSuccess: () => {
      toast.success('n8n secrets saved (credentials + config)');
      queryClient.invalidateQueries({ queryKey: ['mcp-secrets'] });
      setSecretsOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to save secrets: ${error.message}`);
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (mapping: any) => {
      if (!tenantId) throw new Error('No tenant ID');
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');
      return upsertWorkflowMap(tenantId, {
        workflow_key: mapping.workflow_key,
        webhook_path: mapping.webhook_path,
        description: mapping.description || '',
        provider: mapping.provider || 'n8n',
        is_active: true,
        created_by: user.data.user.id,
      });
    },
    onSuccess: () => {
      toast.success('Workflow activated');
      queryClient.invalidateQueries({ queryKey: ['mcp-workflows'] });
    },
    onError: (error) => {
      toast.error(`Failed to activate: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!tenantId) throw new Error('No tenant ID');
      return deleteWorkflowMap(id, tenantId);
    },
    onSuccess: () => {
      toast.success('Workflow deleted');
      queryClient.invalidateQueries({ queryKey: ['mcp-workflows'] });
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
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
        const msg = String((error as any)?.message || 'Unknown error');
        // n8n test-mode specific hint
        if (msg.toLowerCase().includes('not registered') || msg.includes('404')) {
          const hint = resolvedUrl?.includes('/webhook-test/')
            ? "n8n test-modus: Klikk 'Execute workflow' i n8n før du tester (gjelder én request)."
            : "Sett workflow til Active i n8n og bruk produksjons-URL (/webhook/...).";
          toast.error(`n8n: Webhook ikke registrert. ${hint}`);
        } else {
          toast.error(`Failed to trigger workflow: ${msg}`);
        }
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

  const handleEdit = (mapping: any) => {
    setFormData({
      workflow_key: mapping.workflow_key,
      webhook_path: mapping.webhook_path,
      description: mapping.description || '',
      is_active: !!mapping.is_active,
    });
    setIsAddDialogOpen(true);
  };

  const handleResolveForMapping = async (workflowKey: string) => {
    if (!tenantId) {
      toast.error('No tenant context available');
      return;
    }
    const url = await resolveWebhook(tenantId, 'n8n', workflowKey);
    setResolvedUrl(url);
    if (url) {
      toast.success('Resolved webhook URL');
    } else {
      toast.error('No mapping found for this workflow key');
    }
  };

  const handleToggleActive = async (workflow: any) => {
    if (!tenantId) {
      toast.error('No tenant context available');
      return;
    }

    try {
      await updateWorkflowMap(workflow.id, tenantId, { is_active: !workflow.is_active });
      toast.success(workflow.is_active ? 'Workflow deactivated' : 'Workflow activated');
      queryClient.invalidateQueries({ queryKey: ['mcp-workflows'] });
    } catch (error: any) {
      toast.error(`Failed to update: ${error.message}`);
    }
  };

  const handleTestTriggerForMapping = async (workflowKey: string) => {
    if (!tenantId) {
      toast.error('No tenant context available');
      return;
    }

    setIsTestingTrigger(true);
    try {
      // Parse custom payload if provided, otherwise use default
      let inputPayload = {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'Test trigger from MCP Workflows admin',
      };

      const customPayloadStr = testPayloads[workflowKey];
      if (customPayloadStr?.trim()) {
        try {
          inputPayload = JSON.parse(customPayloadStr);
        } catch (e) {
          toast.error('Invalid JSON payload. Using default payload.');
        }
      }

      const { data, error } = await supabase.functions.invoke('trigger-n8n-workflow', {
        body: {
          tenantId: tenantId,
          workflowKey: workflowKey,
          action: 'test_trigger',
          input: inputPayload,
        },
      });

      if (error) {
        const msg = String((error as any)?.message || 'Unknown error');
        if (msg.toLowerCase().includes('not registered') || msg.includes('404')) {
          const url = await resolveWebhook(tenantId, 'n8n', workflowKey);
          const hint = url?.includes('/webhook-test/')
            ? "n8n test-modus: Klikk 'Execute workflow' i n8n før du tester."
            : "Sett workflow til Active i n8n og bruk produksjons-URL.";
          toast.error(`n8n: Webhook ikke registrert. ${hint}`);
        } else {
          toast.error(`Failed to trigger: ${msg}`);
        }
        return;
      }

      if (data?.success) {
        toast.success(`Workflow triggered! Run ID: ${data.runId}`);
      } else {
        toast.error(data?.error || 'Unknown error');
      }
    } catch (error: any) {
      toast.error(`Failed to trigger: ${error.message}`);
    } finally {
      setIsTestingTrigger(false);
    }
  };
  if (isLoadingRole || !tenantContext) {
    return <div className="p-8">Loading...</div>;
  }

  if (!isPlatformAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!tenantId) {
    return (
      <div 
      <AppBreadcrumbs levels={generateAdminBreadcrumbs({
  category: "Integrations",
  subcategory: "MCP",
  currentPage: "Workflows"
})} />
      className="p-8">
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

      {/* Access Level Info */}
      {!canManage && !isCheckingPermissions && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            <strong>Read-only Access:</strong> You can view workflow mappings but cannot modify them. 
            Only tenant admins and platform admins can create, edit, or delete workflows.
          </AlertDescription>
        </Alert>
      )}

      {/* Integration Runs Log */}
      <Card>
        <McpIntegrationRunsView tenantId={tenantId} />
      </Card>

      {/* n8n Secrets Configuration */}
      {canManage && (
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
                      disabled={saveSecretsMutation.isPending || !secrets.N8N_MCP_BASE_URL || !canManage}
                    >
                      Save Secrets
                    </Button>
                  </div>
                  
                  {existingSecrets && (
                    <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                      <Info className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-xs">
                        <strong>HMAC Status:</strong> {existingSecrets.N8N_MCP_SIGNING_SECRET ? '✅ Aktivert (gjelder alle workflows)' : '⚪ Ikke konfigurert (webhooks uten signatur)'}
                        <br />
                        HMAC signing er valgfritt og gjelder alle workflows for denne tenant.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
      )}


      {/* Workflow Mappings List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Workflow Mappings</CardTitle>
            <CardDescription>
              Active and inactive workflow configurations
              {canManage === false && ' (Read-only)'}
            </CardDescription>
          </div>
          {canManage && (
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
                    <code>https://jardam.app.n8n.cloud/webhook/87ccc87f-7f8d-4b7d-8e9a-a2c09a510f9b</code> (prod) eller <code>.../webhook-test/87ccc87f-7f8d-4b7d-8e9a-a2c09a510f9b</code> (test)<br />
                    → Base URL (sett i secrets): <code>https://jardam.app.n8n.cloud</code><br />
                    → Webhook Path (sett her): <code>/webhook/87ccc87f-7f8d-4b7d-8e9a-a2c09a510f9b</code> (prod) eller <code>/webhook-test/87ccc87f-7f8d-4b7d-8e9a-a2c09a510f9b</code> (test)
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

                <div className="flex items-center justify-between py-2">
                  <Label htmlFor="is_active">Active</Label>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(v) =>
                      setFormData({ ...formData, is_active: v as boolean })
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
          )}
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
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-medium">
                        {workflow.workflow_key}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {workflow.provider}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {workflow.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <Switch
                          checked={workflow.is_active}
                          onCheckedChange={() => handleToggleActive(workflow)}
                          disabled={!canManage}
                        />
                      </div>
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
                    
                    {/* Test Payload JSON */}
                    {canManage && (
                      <div className="pt-2 space-y-1">
                        <Label htmlFor={`payload-${workflow.workflow_key}`} className="text-xs">
                          Test Payload (JSON)
                        </Label>
                        <Textarea
                          id={`payload-${workflow.workflow_key}`}
                          placeholder='{"email": "test@example.com", "phone": "+4712345678", "message": "Test"}'
                          value={testPayloads[workflow.workflow_key] || ''}
                          onChange={(e) =>
                            setTestPayloads({ ...testPayloads, [workflow.workflow_key]: e.target.value })
                          }
                          className="font-mono text-xs h-20"
                        />
                        <p className="text-xs text-muted-foreground">
                          Optional: Custom JSON payload for test trigger
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestTriggerForMapping(workflow.workflow_key)}
                      disabled={isTestingTrigger || !canManage}
                      title={canManage ? "Test trigger (n8n må være klar)" : "Test trigger (admin only)"}
                    >
                      <PlayCircle className="h-4 w-4" />
                    </Button>
                    {canManage && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(workflow)}
                          title="Edit mapping"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this workflow mapping?')) {
                              deleteMutation.mutate(workflow.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          title="Delete mapping"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
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
