import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  AlertCircle, 
  Code2, 
  CheckCircle, 
  XCircle,
  FileJson,
  Info,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { McpActionDetailsDialog } from "@/components/admin/mcp/McpActionDetailsDialog";

interface McpRegistryEntry {
  id: string;
  tenant_id: string;
  app_key: string;
  action_key: string;
  fq_action: string;
  version: string;
  description?: string;
  input_schema?: any;
  output_schema?: any;
  enabled: boolean;
  created_at: string;
  created_by: string;
}

interface McpActionsTabProps {
  tenantId: string;
}

export function McpActionsTab({ tenantId }: McpActionsTabProps) {
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [appFilter, setAppFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAction, setSelectedAction] = useState<McpRegistryEntry | null>(null);

  // Fetch MCP actions
  const { data: actions, isLoading } = useQuery({
    queryKey: ["mcp-actions", tenantId, appFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("mcp_action_registry")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (appFilter !== "all") {
        query = query.eq("app_key", appFilter);
      }

      if (statusFilter !== "all") {
        query = query.eq("enabled", statusFilter === "enabled");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as McpRegistryEntry[];
    },
    enabled: !!tenantId,
  });

  // Get unique app keys for filter
  const appKeys = Array.from(new Set(actions?.map(a => a.app_key) || []));

  // Toggle action enabled status
  const toggleActionMutation = useMutation({
    mutationFn: async ({ actionId, enabled }: { actionId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("mcp_action_registry")
        .update({ enabled })
        .eq("id", actionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcp-actions"] });
      toast.success("Action status oppdatert");
    },
    onError: (error) => {
      console.error("Failed to toggle action:", error);
      toast.error("Kunne ikke oppdatere action status");
    },
  });

  // Filter actions by search
  const filteredActions = actions?.filter(action => {
    const searchLower = searchQuery.toLowerCase();
    return (
      action.fq_action.toLowerCase().includes(searchLower) ||
      action.action_key.toLowerCase().includes(searchLower) ||
      action.app_key.toLowerCase().includes(searchLower) ||
      action.description?.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">MCP Actions Registry</h3>
        <p className="text-sm text-muted-foreground">
          Oversikt over registrerte MCP-aksjoner for denne tenanten
        </p>
      </div>

      {/* Filters */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Søk etter actions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={appFilter} onValueChange={setAppFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrer etter app" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle apps</SelectItem>
            {appKeys.map(key => (
              <SelectItem key={key} value={key}>{key}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrer etter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statuser</SelectItem>
            <SelectItem value="enabled">Aktivert</SelectItem>
            <SelectItem value="disabled">Deaktivert</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Totalt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actions?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Aktivert</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {actions?.filter(a => a.enabled).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Deaktivert</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {actions?.filter(a => !a.enabled).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Apps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appKeys.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions List */}
      {!filteredActions || filteredActions.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ingen actions funnet</h3>
            <p className="text-muted-foreground">
              {searchQuery ? "Prøv et annet søk" : "Ingen MCP actions er registrert ennå"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredActions.map((action) => (
            <Card key={action.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Code2 className="h-4 w-4" />
                      {action.action_key}
                    </CardTitle>
                    <CardDescription className="text-xs font-mono">
                      {action.fq_action}
                    </CardDescription>
                  </div>
                  {action.enabled ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Aktivert
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      Deaktivert
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {action.description && (
                  <p className="text-sm text-muted-foreground">
                    {action.description}
                  </p>
                )}
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">App:</span>
                    <Badge variant="outline">{action.app_key}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Version:</span>
                    <span className="font-mono text-xs">{action.version}</span>
                  </div>
                  {action.input_schema && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileJson className="h-4 w-4" />
                      <span className="text-xs">Input schema definert</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelectedAction(action)}
                  >
                    <Info className="h-4 w-4 mr-2" />
                    Detaljer
                  </Button>
                  <Button
                    variant={action.enabled ? "secondary" : "default"}
                    size="sm"
                    onClick={() => toggleActionMutation.mutate({
                      actionId: action.id,
                      enabled: !action.enabled
                    })}
                    disabled={toggleActionMutation.isPending}
                  >
                    {action.enabled ? "Deaktiver" : "Aktiver"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Details Dialog */}
      {selectedAction && (
        <McpActionDetailsDialog
          action={selectedAction}
          open={!!selectedAction}
          onOpenChange={(open) => !open && setSelectedAction(null)}
        />
      )}
    </div>
  );
}
