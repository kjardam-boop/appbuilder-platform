/**
 * Credentials Admin Page
 * Platform admin UI for managing encrypted credentials
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Shield, Building2, Workflow, Puzzle, KeyRound } from "lucide-react";
import { useTenantContext } from "@/hooks/useTenantContext";
import { useIsPlatformTenant } from "@/hooks/useIsPlatformTenant";
import { CredentialsList } from "@/components/admin/credentials/CredentialsList";
import { CredentialManagementDialog } from "@/components/admin/credentials/CredentialManagementDialog";
import { CredentialAuditLog } from "@/components/admin/credentials/CredentialAuditLog";
import { IntegrationSecretsTab } from "@/components/admin/credentials/IntegrationSecretsTab";
import { supabase } from "@/integrations/supabase/client";
import { AppBreadcrumbs } from '@/components/ui/app-breadcrumbs';
import { generateAdminBreadcrumbs } from '@/helpers/breadcrumbHelper';

export default function CredentialsPage() {
  const context = useTenantContext();
  const { isPlatformTenant, isLoading: isPlatformLoading } = useIsPlatformTenant();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"tenant" | "company" | "app" | "secrets">("tenant");

  const { data: tenantCredentials, refetch: refetchTenantCredentials } = useQuery({
    queryKey: ["tenant-credentials", context?.tenant_id],
    queryFn: async () => {
      if (!context?.tenant_id) return [];
      
      const { data, error } = await supabase
        .from("vault_credentials")
        .select("*")
        .eq("tenant_id", context.tenant_id)
        .eq("resource_type", "tenant_integration")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        test_status: d.test_status as 'success' | 'failed' | undefined,
      }));
    },
    enabled: !!context?.tenant_id,
  });

  const { data: companyCredentials, refetch: refetchCompanyCredentials } = useQuery({
    queryKey: ["company-credentials", context?.tenant_id],
    queryFn: async () => {
      if (!context?.tenant_id) return [];
      
      const { data, error } = await supabase
        .from("vault_credentials")
        .select("*")
        .eq("tenant_id", context.tenant_id)
        .eq("resource_type", "company_system")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        test_status: d.test_status as 'success' | 'failed' | undefined,
      }));
    },
    enabled: !!context?.tenant_id,
  });

  const { data: appCredentials, refetch: refetchAppCredentials } = useQuery({
    queryKey: ["app-credentials", context?.tenant_id],
    queryFn: async () => {
      if (!context?.tenant_id) return [];
      
      const { data, error } = await supabase
        .from("vault_credentials")
        .select("*")
        .eq("tenant_id", context.tenant_id)
        .eq("resource_type", "app_integration")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        test_status: d.test_status as 'success' | 'failed' | undefined,
      }));
    },
    enabled: !!context?.tenant_id,
  });

  if (!context || isPlatformLoading) {
    return (
      <div className="container mx-auto p-6">
        <AppBreadcrumbs levels={generateAdminBreadcrumbs({
  category: "Integrations",
  currentPage: "Credentials"
})} />
        <Card className="p-8 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading tenant context...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Encrypted Credentials
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage API keys and secrets stored securely in Vault
          </p>
        </div>

        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Credential
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as "tenant" | "company" | "app" | "secrets")}>
        <TabsList className="grid w-full max-w-3xl grid-cols-4">
          <TabsTrigger value="tenant" className="flex items-center gap-2">
            <Workflow className="h-4 w-4" />
            Tenant
          </TabsTrigger>
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Company
          </TabsTrigger>
          <TabsTrigger value="app" className="flex items-center gap-2">
            <Puzzle className="h-4 w-4" />
            App
          </TabsTrigger>
          <TabsTrigger value="secrets" className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Integration Secrets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tenant" className="space-y-6 mt-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Tenant Integration Credentials</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Credentials for tenant-wide integrations (available to all users in this tenant)
            </p>

            <CredentialsList
              credentials={tenantCredentials || []}
              metadata={{
                tenant_id: context.tenant_id,
                resource_type: "tenant_integration",
                resource_id: context.tenant_id,
              }}
              onCredentialChanged={() => refetchTenantCredentials()}
            />
          </Card>
        </TabsContent>

        <TabsContent value="company" className="space-y-6 mt-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Company System Credentials</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Credentials for company-specific external systems
            </p>

            <CredentialsList
              credentials={companyCredentials || []}
              metadata={{
                tenant_id: context.tenant_id,
                resource_type: "company_system",
                resource_id: context.tenant_id,
              }}
              onCredentialChanged={() => refetchCompanyCredentials()}
            />
          </Card>
        </TabsContent>

        <TabsContent value="app" className="space-y-6 mt-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">App Integration Credentials</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Credentials for application-specific integrations
            </p>

            <CredentialsList
              credentials={appCredentials || []}
              metadata={{
                tenant_id: context.tenant_id,
                resource_type: "app_integration",
                resource_id: context.tenant_id,
              }}
              onCredentialChanged={() => refetchAppCredentials()}
            />
          </Card>
        </TabsContent>

        <TabsContent value="secrets" className="space-y-6 mt-6">
          <IntegrationSecretsTab tenantId={context.tenant_id} />
        </TabsContent>
      </Tabs>

      <CredentialAuditLog tenantId={context.tenant_id} />

        <CredentialManagementDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          isPlatformAdmin={isPlatformTenant}
          onSaved={() => {
          if (selectedTab === "tenant") {
            refetchTenantCredentials();
          } else if (selectedTab === "company") {
            refetchCompanyCredentials();
          } else {
            refetchAppCredentials();
          }
        }}
      />
    </div>
  );
}
