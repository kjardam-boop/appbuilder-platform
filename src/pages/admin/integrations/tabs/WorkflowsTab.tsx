/**
 * Workflows Tab
 * Manages n8n workflows with bi-directional sync
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/hooks/useTenantContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Workflow,
  ExternalLink,
  RefreshCw,
  Download,
  Upload,
  Plus,
  MoreVertical,
  Check,
  X,
  Search,
  Clock,
  FileJson,
  CircleDot,
  ArrowUpCircle,
  CheckCircle2,
  AlertCircle,
  Webhook,
  Bot,
} from "lucide-react";
import { N8nSyncService } from "@/modules/core/integrations/services/n8nSyncService";
import { Textarea } from "@/components/ui/textarea";
import type { IntegrationDefinition } from "@/modules/core/integrations/types/integrationRegistry.types";

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

// Trigger method badges
function TriggerBadges({ workflow }: { workflow: IntegrationDefinition }) {
  const mcpEnabled = (workflow as any).mcp_enabled || false;
  const hasWebhook = !!workflow.n8n_webhook_path;
  
  return (
    <div className="flex gap-1">
      {hasWebhook && (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
          <Webhook className="h-2.5 w-2.5 mr-1" />
          Webhook
        </Badge>
      )}
      {mcpEnabled && (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
          <Bot className="h-2.5 w-2.5 mr-1" />
          MCP
        </Badge>
      )}
      {!hasWebhook && !mcpEnabled && (
        <span className="text-muted-foreground text-xs">-</span>
      )}
    </div>
  );
}

export default function WorkflowsTab() {
  const tenantContext = useTenantContext();
  const tenantId = tenantContext?.tenant_id;
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [newWorkflowJson, setNewWorkflowJson] = useState("");
  const [newWorkflowName, setNewWorkflowName] = useState("");

  // Fetch workflows from integration_definitions
  // Note: 'type' column is added by migration 20251203100000
  // Falls back to workflow_templates if type column doesn't exist
  const { data: workflows, isLoading, error: workflowsError } = useQuery({
    queryKey: ['integration-definitions', 'workflow'],
    queryFn: async () => {
      // First try with type filter (new schema)
      // Only show active workflows (is_active = true)
      const { data, error } = await supabase
        .from('integration_definitions')
        .select('*')
        .eq('type', 'workflow')
        .eq('is_active', true)
        .order('name');
      
      // If error (likely column doesn't exist), try without filter
      if (error) {
        console.warn('[WorkflowsTab] type column not found, trying without filter:', error.message);
        
        // Fallback: get from workflow_templates instead
        const { data: templates, error: templatesError } = await supabase
          .from('workflow_templates')
          .select('*')
          .order('name');
        
        if (templatesError) {
          console.error('[WorkflowsTab] workflow_templates query failed:', templatesError);
          return [];
        }
        
        // Map workflow_templates to IntegrationDefinition-like structure
        return (templates || []).map(t => ({
          id: t.id,
          key: t.key,
          name: t.name,
          description: t.description,
          type: 'workflow' as const,
          n8n_workflow_id: t.n8n_workflow_id,
          n8n_webhook_path: t.n8n_webhook_path,
          is_active: t.is_active,
          created_at: t.created_at,
          updated_at: t.updated_at,
          // Fill in missing fields
          category_id: null,
          vendor_id: null,
          external_system_id: null,
          supported_delivery_methods: [],
          default_delivery_method: null,
          icon_name: 'Workflow',
          documentation_url: null,
          setup_guide_url: null,
          requires_credentials: true,
          credential_fields: [],
          default_config: {},
          capabilities: {},
          tags: [],
          workflow_json: null,
          last_synced_at: null,
        })) as IntegrationDefinition[];
      }
      
      return (data || []) as IntegrationDefinition[];
    },
  });

  // Fetch n8n workflows directly (for comparison)
  const { data: n8nWorkflows, refetch: refetchN8n } = useQuery({
    queryKey: ['n8n-workflows', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      return N8nSyncService.listWorkflows(tenantId);
    },
    enabled: !!tenantId,
  });

  // Sync all from n8n
  const syncAllMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant');
      setIsSyncing(true);
      return N8nSyncService.syncAllFromN8n(tenantId);
    },
    onSuccess: (result) => {
      setIsSyncing(false);
      setSyncDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['integration-definitions', 'workflow'] });
      refetchN8n();
      
      if (result.synced > 0) {
        toast.success(`Synkronisert ${result.synced} workflows fra n8n`);
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} workflows feilet`, {
          description: result.errors.slice(0, 3).join('\n'),
        });
      }
      if (result.synced === 0 && result.failed === 0) {
        toast.info('Ingen nye workflows å synkronisere');
      }
    },
    onError: (error) => {
      setIsSyncing(false);
      toast.error('Sync feilet', { description: (error as Error).message });
    },
  });

  // Sync single workflow
  const syncSingleMutation = useMutation({
    mutationFn: async (n8nWorkflowId: string) => {
      if (!tenantId) throw new Error('No tenant');
      return N8nSyncService.syncToDatabase(tenantId, n8nWorkflowId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-definitions', 'workflow'] });
      toast.success('Workflow synkronisert');
    },
    onError: (error) => {
      toast.error('Sync feilet', { description: (error as Error).message });
    },
  });

  // Push workflow to n8n
  const pushToN8nMutation = useMutation({
    mutationFn: async ({ name, workflowJson }: { name: string; workflowJson: any }) => {
      if (!tenantId) throw new Error('No tenant');
      
      // Push to n8n
      const result = await N8nSyncService.pushWorkflow(tenantId, {
        name,
        ...workflowJson,
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Push failed');
      }
      
      // Save to integration_definitions with status 'pushed'
      const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const { error } = await supabase
        .from('integration_definitions')
        .upsert({
          key,
          name,
          description: workflowJson.description || `Workflow: ${name}`,
          type: 'workflow',
          icon_name: 'Workflow',
          n8n_workflow_id: result.workflow_id,
          n8n_webhook_path: result.webhook_path,
          workflow_json: workflowJson,
          sync_status: 'pushed',
          requires_credentials: true,
          is_active: true,
        }, { onConflict: 'key' });
      
      if (error) throw error;
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-definitions', 'workflow'] });
      refetchN8n();
      setCreateDialogOpen(false);
      setNewWorkflowJson("");
      setNewWorkflowName("");
      toast.success('Workflow opprettet og pushet til n8n');
    },
    onError: (error) => {
      toast.error('Push feilet', { description: (error as Error).message });
    },
  });

  // Filter workflows
  const filteredWorkflows = (workflows || []).filter(w => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Find workflows in n8n not yet in platform
  const platformKeys = new Set((workflows || []).map(w => w.n8n_workflow_id).filter(Boolean));
  const unsyncedN8nWorkflows = (n8nWorkflows || []).filter(w => !platformKeys.has(w.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Workflows</h2>
          <p className="text-muted-foreground">
            n8n workflows med bi-direktional sync
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={async () => {
              if (!tenantId) {
                toast.error('Ingen tenant valgt');
                return;
              }
              toast.info('Tester n8n-tilkobling...');
              try {
                const workflows = await N8nSyncService.listWorkflows(tenantId);
                toast.success(`Tilkobling OK! Fant ${workflows.length} workflows i n8n`);
              } catch (err) {
                toast.error('Tilkobling feilet', { 
                  description: (err as Error).message,
                  duration: 10000 
                });
              }
            }}
          >
            Test tilkobling
          </Button>
          <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Sync fra n8n
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Synkroniser fra n8n</DialogTitle>
                <DialogDescription>
                  Henter alle workflows fra n8n og oppdaterer integrasjonskatalogen.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                {unsyncedN8nWorkflows.length > 0 && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">
                      {unsyncedN8nWorkflows.length} nye workflows funnet i n8n:
                    </p>
                    <ul className="text-sm text-muted-foreground mt-1">
                      {unsyncedN8nWorkflows.slice(0, 5).map(w => (
                        <li key={w.id}>• {w.name}</li>
                      ))}
                      {unsyncedN8nWorkflows.length > 5 && (
                        <li>• ... og {unsyncedN8nWorkflows.length - 5} flere</li>
                      )}
                    </ul>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSyncDialogOpen(false)}>
                    Avbryt
                  </Button>
                  <Button onClick={() => syncAllMutation.mutate()} disabled={isSyncing}>
                    {isSyncing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Synkroniserer...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Sync alle
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Opprett workflow
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Opprett ny workflow</DialogTitle>
                <DialogDescription>
                  Opprett en workflow og push den til n8n
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="workflow-name">Workflow navn</Label>
                  <Input
                    id="workflow-name"
                    placeholder="Min nye workflow"
                    value={newWorkflowName}
                    onChange={(e) => setNewWorkflowName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="workflow-json">Workflow JSON</Label>
                  <Textarea
                    id="workflow-json"
                    placeholder='{"nodes": [...], "connections": {...}}'
                    value={newWorkflowJson}
                    onChange={(e) => setNewWorkflowJson(e.target.value)}
                    className="mt-1 font-mono text-xs h-64"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Lim inn n8n workflow JSON, eller opprett en enkel mal
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Avbryt
                  </Button>
                  <Button 
                    onClick={() => {
                      try {
                        const json = JSON.parse(newWorkflowJson);
                        pushToN8nMutation.mutate({ name: newWorkflowName, workflowJson: json });
                      } catch {
                        toast.error('Ugyldig JSON format');
                      }
                    }}
                    disabled={pushToN8nMutation.isPending || !newWorkflowName || !newWorkflowJson}
                  >
                    {pushToN8nMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Pusher...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Push til n8n
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Søk workflows..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Totalt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflows?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Synkronisert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(workflows || []).filter(w => w.sync_status === 'synced' || w.workflow_json).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              n8n Workflows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{n8nWorkflows?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ikke synkronisert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{unsyncedN8nWorkflows.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Workflows table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            Registrerte workflows
          </CardTitle>
          <CardDescription>
            Workflows synkronisert fra n8n
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <div className="text-center py-8">
              <Workflow className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Ingen workflows funnet</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setSyncDialogOpen(true)}
              >
                <Download className="h-4 w-4 mr-2" />
                Sync fra n8n
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Navn</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Sist synket</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aktiv</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkflows.map(workflow => (
                  <TableRow key={workflow.id}>
                    <TableCell className="font-medium">
                      <Link 
                        to={`/admin/integrations/workflows/${workflow.id}`}
                        className="flex items-center gap-2 hover:underline text-primary"
                      >
                        {workflow.name}
                        {workflow.workflow_json && (
                          <FileJson className="h-3 w-3 text-muted-foreground" title="Har workflow JSON" />
                        )}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {workflow.key}
                      </code>
                    </TableCell>
                    <TableCell>
                      {workflow.n8n_webhook_path ? (
                        <code className="text-xs bg-muted px-2 py-1 rounded max-w-[200px] truncate block">
                          {workflow.n8n_webhook_path}
                        </code>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <TriggerBadges workflow={workflow} />
                    </TableCell>
                    <TableCell>
                      {workflow.last_synced_at ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(workflow.last_synced_at).toLocaleDateString('nb-NO')}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Aldri</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <SyncStatusBadge status={workflow.sync_status} />
                    </TableCell>
                    <TableCell>
                      {workflow.is_active ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-gray-400" />
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/admin/integrations/workflows/${workflow.id}`}>
                              <Workflow className="h-4 w-4 mr-2" />
                              Åpne detaljer
                            </Link>
                          </DropdownMenuItem>
                          {workflow.n8n_workflow_id && (
                            <>
                              <DropdownMenuItem asChild>
                                <a 
                                  href={`https://jardam.app.n8n.cloud/workflow/${workflow.n8n_workflow_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Åpne i n8n
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => syncSingleMutation.mutate(workflow.n8n_workflow_id!)}
                                disabled={syncSingleMutation.isPending}
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Sync fra n8n
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Unsynced workflows from n8n */}
      {unsyncedN8nWorkflows.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Download className="h-5 w-5" />
              Nye workflows i n8n
            </CardTitle>
            <CardDescription>
              Disse workflows finnes i n8n men er ikke synkronisert til plattformen ennå
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unsyncedN8nWorkflows.map(workflow => (
                <div 
                  key={workflow.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{workflow.name}</p>
                    <p className="text-sm text-muted-foreground">ID: {workflow.id}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => syncSingleMutation.mutate(workflow.id)}
                    disabled={syncSingleMutation.isPending}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Sync
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
