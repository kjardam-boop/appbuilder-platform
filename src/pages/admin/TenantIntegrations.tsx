import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Server, Brain, Database, Code2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { McpProvidersTab } from "@/components/admin/integrations/McpProvidersTab";
import { AIProvidersTab } from "@/components/admin/integrations/AIProvidersTab";
import { ExternalSystemsTab } from "@/components/admin/integrations/ExternalSystemsTab";
import { McpActionsTab } from "@/components/admin/integrations/McpActionsTab";
import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";

/**
 * Tenant Integrations Management
 * Centralized page for managing:
 * - MCP Providers (n8n, make.com, etc.)
 * - AI Providers (OpenAI, Anthropic, Google, etc.)
 * - External Systems (ERP, CRM, etc.) with MCP links
 */
export default function TenantIntegrations() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();

  // Fetch tenant details
  const { data: tenant, isLoading: isLoadingTenant } = useQuery({
    queryKey: ["tenant", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", tenantId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  if (isLoadingTenant) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Tenant ikke funnet</CardTitle>
            <CardDescription>
              Kunne ikke finne tenant med ID: {tenantId}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <AppBreadcrumbs levels={[
        { label: "Admin", href: "/admin" },
        { label: "Tenants", href: "/admin/tenants" },
        { label: tenant.name, href: `/admin/tenants/${tenantId}` },
        { label: "Integrasjoner" }
      ]} />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/admin/tenants/${tenantId}`)}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbake
          </Button>
          <h1 className="text-3xl font-bold">Integrasjoner</h1>
          <p className="text-muted-foreground">
            Administrer MCP providers, AI providers og eksterne systemer for{" "}
            <span className="font-semibold">{tenant.name}</span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="mcp-providers" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="mcp-providers" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            MCP Providers
          </TabsTrigger>
          <TabsTrigger value="ai-providers" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Providers
          </TabsTrigger>
          <TabsTrigger value="external-systems" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Eksterne Systemer
          </TabsTrigger>
          <TabsTrigger value="mcp-actions" className="flex items-center gap-2">
            <Code2 className="h-4 w-4" />
            MCP Actions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mcp-providers" className="space-y-6">
          <McpProvidersTab tenantId={tenantId!} />
        </TabsContent>

        <TabsContent value="ai-providers" className="space-y-6">
          <AIProvidersTab tenantId={tenantId!} />
        </TabsContent>

        <TabsContent value="external-systems" className="space-y-6">
          <ExternalSystemsTab tenantId={tenantId!} />
        </TabsContent>

        <TabsContent value="mcp-actions" className="space-y-6">
          <McpActionsTab tenantId={tenantId!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
