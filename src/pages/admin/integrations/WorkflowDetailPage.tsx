/**
 * Workflow Detail Page
 * Full page view for workflow configuration and management
 */

import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/hooks/useTenantContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft,
  Workflow,
  ExternalLink,
  RefreshCw,
  Upload,
  Clock,
  CheckCircle2,
  CircleDot,
  ArrowUpCircle,
  AlertCircle,
  Webhook,
  Bot,
  Copy,
  Check,
  FileJson,
  Save,
  Layers,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { N8nSyncService } from "@/modules/core/integrations/services/n8nSyncService";
import { WorkflowJsonViewer } from "@/components/admin/n8n/WorkflowJsonViewer";
import { WorkflowTemplatePicker } from "@/components/admin/n8n/WorkflowTemplatePicker";
import type { IntegrationDefinition } from "@/modules/core/integrations/types/integrationRegistry.types";
import { useState } from "react";

// Sync status type
type SyncStatus = 'draft' | 'pushed' | 'synced' | 'outdated';

// Status badge component
function SyncStatusBadge({ status }: { status: SyncStatus | null | undefined }) {
  const statusConfig: Record<SyncStatus, { label: string; className: string; icon: React.ReactNode }> = {
    draft: { 
      label: 'Utkast', 
      className: 'bg-gray-100 text-gray-700 border-gray-200',
      icon: <CircleDot className="h-3 w-3" />
    },
    pushed: { 
      label: 'Sendt til n8n', 
      className: 'bg-amber-100 text-amber-700 border-amber-200',
      icon: <ArrowUpCircle className="h-3 w-3" />
    },
    synced: { 
      label: 'Synkronisert', 
      className: 'bg-green-100 text-green-700 border-green-200',
      icon: <CheckCircle2 className="h-3 w-3" />
    },
    outdated: { 
      label: 'Utdatert', 
      className: 'bg-orange-100 text-orange-700 border-orange-200',
      icon: <AlertCircle className="h-3 w-3" />
    },
  };

  const config = statusConfig[status || 'draft'];
  
  return (
    <Badge variant="outline" className={`${config.className} flex items-center gap-1`}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

// Trigger method badge
function TriggerMethodBadge({ method, enabled = true }: { method: 'webhook' | 'mcp'; enabled?: boolean }) {
  const config = {
    webhook: {
      label: 'Webhook',
      icon: <Webhook className="h-3 w-3" />,
      className: enabled 
        ? 'bg-blue-100 text-blue-700 border-blue-200' 
        : 'bg-gray-100 text-gray-400 border-gray-200',
    },
    mcp: {
      label: 'MCP',
      icon: <Bot className="h-3 w-3" />,
      className: enabled 
        ? 'bg-purple-100 text-purple-700 border-purple-200' 
        : 'bg-gray-100 text-gray-400 border-gray-200',
    },
  };

  const c = config[method];
  return (
    <Badge variant="outline" className={`${c.className} flex items-center gap-1`}>
      {c.icon}
      {c.label}
    </Badge>
  );
}

export default function WorkflowDetailPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const tenantContext = useTenantContext();
  const tenantId = tenantContext?.tenant_id;
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importJson, setImportJson] = useState("");

  // Fetch workflow
  const { data: workflow, isLoading, error } = useQuery({
    queryKey: ['workflow-detail', workflowId],
    queryFn: async () => {
      if (!workflowId) return null;
      
      const { data, error } = await supabase
        .from('integration_definitions')
        .select('*')
        .eq('id', workflowId)
        .single();
      
      if (error) throw error;
      return data as IntegrationDefinition;
    },
    enabled: !!workflowId,
  });

  // Sync from n8n mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId || !workflow?.n8n_workflow_id) throw new Error('Missing data');
      return N8nSyncService.syncToDatabase(tenantId, workflow.n8n_workflow_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-detail', workflowId] });
      queryClient.invalidateQueries({ queryKey: ['integration-definitions', 'workflow'] });
      toast.success('Workflow synkronisert fra n8n');
    },
    onError: (error) => {
      toast.error('Sync feilet', { description: (error as Error).message });
    },
  });

  // Push to n8n mutation
  const pushMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId || !workflow) throw new Error('Missing data');
      
      // Create workflow payload - either from existing JSON or create empty
      const workflowPayload = workflow.workflow_json 
        ? { name: workflow.name, ...workflow.workflow_json }
        : {
            name: workflow.name,
            nodes: [
              {
                id: 'webhook-trigger',
                name: 'Webhook Trigger',
                type: 'n8n-nodes-base.webhook',
                typeVersion: 2,
                position: [250, 300],
                parameters: {
                  httpMethod: 'POST',
                  path: workflow.key,
                  responseMode: 'onReceived',
                  responseData: 'allEntries',
                },
              },
            ],
            connections: {},
            settings: {
              executionOrder: 'v1',
            },
            active: false,
          };
      
      const result = await N8nSyncService.pushWorkflow(tenantId, workflowPayload);
      
      if (!result.success) throw new Error(result.error || 'Push failed');
      
      // Update integration_definitions with n8n info
      const { error } = await supabase
        .from('integration_definitions')
        .update({
          n8n_workflow_id: result.workflow_id,
          n8n_webhook_path: result.webhook_path || `/webhook/${workflow.key}`,
          sync_status: 'pushed',
        })
        .eq('id', workflowId);
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-detail', workflowId] });
      queryClient.invalidateQueries({ queryKey: ['integration-definitions', 'workflow'] });
      toast.success('Workflow pushet til n8n');
    },
    onError: (error) => {
      toast.error('Push feilet', { description: (error as Error).message });
    },
  });

  // Toggle MCP mutation
  const toggleMcpMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from('integration_definitions')
        .update({ 
          mcp_enabled: enabled,
          available_trigger_methods: enabled ? ['webhook', 'mcp'] : ['webhook'],
        })
        .eq('id', workflowId);
      
      if (error) throw error;
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-detail', workflowId] });
      toast.success(enabled ? 'MCP aktivert' : 'MCP deaktivert');
    },
    onError: (error) => {
      toast.error('Kunne ikke oppdatere MCP', { description: (error as Error).message });
    },
  });

  // Update n8n workflow mutation (for existing workflows)
  const updateN8nMutation = useMutation({
    mutationFn: async (workflowJson: any) => {
      if (!tenantId || !workflow?.n8n_workflow_id) throw new Error('Missing workflow ID');
      
      // Call edge function to update workflow in n8n
      const { data, error } = await supabase.functions.invoke('n8n-sync', {
        body: {
          action: 'update',
          tenantId,
          workflowId: workflow.n8n_workflow_id,
          workflow: {
            ...workflowJson,
            name: workflow.name,
          },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Also update local database with new JSON
      const { error: dbError } = await supabase
        .from('integration_definitions')
        .update({
          workflow_json: workflowJson,
          sync_status: 'synced',
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', workflowId);

      if (dbError) throw dbError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-detail', workflowId] });
      queryClient.invalidateQueries({ queryKey: ['integration-definitions', 'workflow'] });
      setImportDialogOpen(false);
      setImportJson("");
      toast.success('Workflow oppdatert i n8n');
    },
    onError: (error) => {
      toast.error('Oppdatering feilet', { description: (error as Error).message });
    },
  });

  // Save JSON locally mutation (without pushing to n8n)
  const saveJsonLocallyMutation = useMutation({
    mutationFn: async (workflowJson: any) => {
      const { error } = await supabase
        .from('integration_definitions')
        .update({
          workflow_json: workflowJson,
          sync_status: 'draft',
        })
        .eq('id', workflowId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-detail', workflowId] });
      setImportDialogOpen(false);
      setImportJson("");
      toast.success('Workflow JSON lagret lokalt');
    },
    onError: (error) => {
      toast.error('Lagring feilet', { description: (error as Error).message });
    },
  });

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(importJson);
      if (workflow?.n8n_workflow_id) {
        // Update existing n8n workflow
        updateN8nMutation.mutate(parsed);
      } else {
        // Save locally first, then push
        saveJsonLocallyMutation.mutate(parsed);
      }
    } catch (e) {
      toast.error('Ugyldig JSON format');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Workflow ikke funnet</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tilbake
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const mcpEnabled = (workflow as any).mcp_enabled || false;
  const availableTriggers = (workflow as any).available_trigger_methods || ['webhook'];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/integrations?tab=workflows')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <Workflow className="h-6 w-6" />
              <h1 className="text-2xl font-bold">{workflow.name}</h1>
              <SyncStatusBadge status={workflow.sync_status} />
            </div>
            <p className="text-muted-foreground mt-1">
              {workflow.description || 'Ingen beskrivelse'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {workflow.n8n_workflow_id && (
            <Button variant="outline" asChild>
              <a 
                href={`https://jardam.app.n8n.cloud/workflow/${workflow.n8n_workflow_id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Åpne i n8n
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Config */}
        <div className="lg:col-span-1 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Grunnleggende Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Key</Label>
                <code className="block mt-1 text-sm bg-muted px-2 py-1 rounded">
                  {workflow.key}
                </code>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Aktiv</span>
                <Badge variant={workflow.is_active ? "default" : "secondary"}>
                  {workflow.is_active ? "Ja" : "Nei"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Opprettet</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(workflow.created_at).toLocaleDateString('nb-NO')}
                </span>
              </div>
              
              {workflow.last_synced_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sist synket</span>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(workflow.last_synced_at).toLocaleString('nb-NO')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* n8n Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">n8n Konfigurasjon</CardTitle>
              <CardDescription>
                {workflow.n8n_workflow_id ? 'Koblet til n8n' : 'Ikke koblet til n8n ennå'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Workflow ID */}
              <div>
                <Label className="text-xs text-muted-foreground">Workflow ID</Label>
                {workflow.n8n_workflow_id ? (
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 text-xs bg-muted px-2 py-1 rounded truncate">
                      {workflow.n8n_workflow_id}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(workflow.n8n_workflow_id!)}
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">Ikke tildelt</p>
                )}
              </div>
              
              {/* Webhook Path */}
              <div>
                <Label className="text-xs text-muted-foreground">Webhook Path</Label>
                {workflow.n8n_webhook_path ? (
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 text-xs bg-muted px-2 py-1 rounded truncate">
                      {workflow.n8n_webhook_path}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(workflow.n8n_webhook_path!)}
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">Ikke konfigurert</p>
                )}
              </div>

              {/* Full Webhook URL */}
              {workflow.n8n_webhook_path && (
                <div>
                  <Label className="text-xs text-muted-foreground">Full Webhook URL</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 text-xs bg-muted px-2 py-1 rounded truncate">
                      https://jardam.app.n8n.cloud{workflow.n8n_webhook_path}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(`https://jardam.app.n8n.cloud${workflow.n8n_webhook_path}`)}
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              )}

              <Separator />

              {/* Actions */}
              <div className="space-y-2">
                {workflow.n8n_workflow_id ? (
                  <>
                    {/* Sync from n8n */}
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => syncMutation.mutate()}
                      disabled={syncMutation.isPending}
                    >
                      {syncMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Sync fra n8n
                    </Button>
                    
                    {/* Open in n8n */}
                    <Button variant="outline" className="w-full" asChild>
                      <a 
                        href={`https://jardam.app.n8n.cloud/workflow/${workflow.n8n_workflow_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Åpne i n8n Editor
                      </a>
                    </Button>

                    <Separator />

                    {/* Import/Update JSON */}
                    <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <FileJson className="h-4 w-4 mr-2" />
                          Importer & oppdater JSON
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                        <DialogHeader>
                          <DialogTitle>Importer Workflow JSON</DialogTitle>
                          <DialogDescription>
                            Lim inn n8n workflow JSON for å oppdatere workflowen i n8n
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex-1 min-h-0 py-4">
                          <Textarea
                            placeholder='Lim inn n8n workflow JSON her...'
                            value={importJson}
                            onChange={(e) => setImportJson(e.target.value)}
                            className="font-mono text-xs h-[400px] resize-none"
                            autoResize={false}
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            Tips: I n8n kan du kopiere workflow JSON via menyen (⋮) → Download
                          </p>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                            Avbryt
                          </Button>
                          <Button
                            onClick={handleImportJson}
                            disabled={!importJson || updateN8nMutation.isPending}
                          >
                            {updateN8nMutation.isPending ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4 mr-2" />
                            )}
                            Oppdater i n8n
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </>
                ) : (
                  <>
                    {/* Import JSON first */}
                    <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <FileJson className="h-4 w-4 mr-2" />
                          Importer workflow JSON
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                        <DialogHeader>
                          <DialogTitle>Importer Workflow JSON</DialogTitle>
                          <DialogDescription>
                            Lim inn n8n workflow JSON - du kan deretter pushe til n8n
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex-1 min-h-0 py-4">
                          <Textarea
                            placeholder='Lim inn n8n workflow JSON her...'
                            value={importJson}
                            onChange={(e) => setImportJson(e.target.value)}
                            className="font-mono text-xs h-[400px] resize-none"
                            autoResize={false}
                          />
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                            Avbryt
                          </Button>
                          <Button
                            onClick={handleImportJson}
                            disabled={!importJson || saveJsonLocallyMutation.isPending}
                          >
                            {saveJsonLocallyMutation.isPending ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4 mr-2" />
                            )}
                            Lagre JSON
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    {/* Push to n8n (with or without JSON) */}
                    <Button 
                      className="w-full"
                      onClick={() => pushMutation.mutate()}
                      disabled={pushMutation.isPending}
                    >
                      {pushMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {workflow.workflow_json ? 'Push til n8n' : 'Opprett tom workflow i n8n'}
                    </Button>
                    
                    <p className="text-xs text-muted-foreground text-center">
                      {workflow.workflow_json 
                        ? 'Sender workflow JSON til n8n' 
                        : 'Oppretter en tom workflow du kan redigere i n8n'
                      }
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Template Picker */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileJson className="h-4 w-4" />
                Workflow Maler
              </CardTitle>
              <CardDescription>
                Velg en mal for å oppdatere workflowen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WorkflowTemplatePicker
                workflowKey={workflow.key}
                currentWorkflowJson={workflow.workflow_json}
                onApplyTemplate={(templateJson) => {
                  if (workflow.n8n_workflow_id) {
                    updateN8nMutation.mutate(templateJson);
                  } else {
                    saveJsonLocallyMutation.mutate(templateJson);
                  }
                }}
                isApplying={updateN8nMutation.isPending || saveJsonLocallyMutation.isPending}
              />
            </CardContent>
          </Card>

          {/* Trigger Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trigger-metoder</CardTitle>
              <CardDescription>
                Hvordan denne workflowen kan startes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <TriggerMethodBadge method="webhook" enabled={availableTriggers.includes('webhook')} />
                <TriggerMethodBadge method="mcp" enabled={mcpEnabled} />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="mcp-toggle" className="text-sm font-medium">
                    MCP Aktivert
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Tillat AI-klienter å trigge denne workflowen
                  </p>
                </div>
                <Switch
                  id="mcp-toggle"
                  checked={mcpEnabled}
                  onCheckedChange={(checked) => toggleMcpMutation.mutate(checked)}
                  disabled={toggleMcpMutation.isPending || !workflow.n8n_workflow_id}
                />
              </div>
              
              {!workflow.n8n_workflow_id && (
                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  MCP krever at workflowen er synkronisert med n8n først
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - JSON Viewer */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Workflow Definisjon</CardTitle>
              <CardDescription>
                JSON-struktur fra n8n
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workflow.workflow_json ? (
                <WorkflowJsonViewer 
                  workflowJson={workflow.workflow_json as any} 
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Workflow className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Ingen workflow JSON tilgjengelig</p>
                  <p className="text-sm mt-2">
                    Sync fra n8n for å hente workflow-definisjonen
                  </p>
                  {workflow.n8n_workflow_id && (
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => syncMutation.mutate()}
                      disabled={syncMutation.isPending}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync fra n8n
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

