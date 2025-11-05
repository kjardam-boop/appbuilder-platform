/**
 * MCP Observability Dashboard
 * View and inspect MCP action logs and integration runs
 */

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Activity, Workflow, Link2 } from "lucide-react";
import { McpActionLogsView } from "@/components/admin/mcp/McpActionLogsView";
import { McpIntegrationRunsView } from "@/components/admin/mcp/McpIntegrationRunsView";
import { McpCorrelateView } from "@/components/admin/mcp/McpCorrelateView";
import { useTenantContext } from "@/hooks/useTenantContext";

export default function McpObservability() {
  const [activeTab, setActiveTab] = useState("actions");
  const tenantContext = useTenantContext();
  const tenantId = tenantContext?.tenant_id;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">MCP Observability</h1>
        <p className="text-muted-foreground">
          Monitor and inspect MCP actions, integration runs, and correlations
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="actions" className="gap-2">
            <Activity className="h-4 w-4" />
            Actions
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Workflow className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="correlate" className="gap-2">
            <Link2 className="h-4 w-4" />
            Correlate
          </TabsTrigger>
        </TabsList>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <McpActionLogsView />
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            {tenantId && <McpIntegrationRunsView tenantId={tenantId} />}
          </Card>
        </TabsContent>

        <TabsContent value="correlate" className="space-y-4">
          <Card>
            <McpCorrelateView />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
