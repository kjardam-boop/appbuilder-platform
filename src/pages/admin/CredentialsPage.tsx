/**
 * Credentials Admin Page
 * Platform admin UI for managing encrypted credentials
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Shield, Building2, Workflow, Puzzle } from "lucide-react";
import { useTenantContext } from "@/hooks/useTenantContext";
import { useIsPlatformTenant } from "@/hooks/useIsPlatformTenant";
import { CredentialsList } from "@/components/admin/credentials/CredentialsList";
import { CredentialManagementDialog } from "@/components/admin/credentials/CredentialManagementDialog";
import { CredentialAuditLog } from "@/components/admin/credentials/CredentialAuditLog";
import { supabase } from "@/integrations/supabase/client";
import { AppBreadcrumbs } from '@/components/ui/app-breadcrumbs';
import { generateAdminBreadcrumbs } from '@/helpers/breadcrumbHelper';

export default function CredentialsPage() {
  const context = useTenantContext();
  const { isPlatformTenant, isLoading: isPlatformLoading } = useIsPlatformTenant();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"tenant" | "company" | "app">("tenant");

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
            Administrer API-nøkler og secrets for integrasjoner
          </p>
        </div>

        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Credential
        </Button>
      </div>

      {/* Architecture explanation */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="pt-4">
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-slate-700 mb-1">🔐 Vault-krypterte credentials</p>
              <p className="text-slate-600 text-xs">
                Alle credentials lagres kryptert med Supabase Vault. Brukes for OAuth tokens, 
                API-nøkler, database-passord, og tredjepartsintegrasjoner.
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-700 mb-1">🏗️ Platform-secrets</p>
              <p className="text-slate-600 text-xs">
                For secrets som gjelder hele plattformen (ikke tenant-spesifikke), 
                bruk <strong>Supabase Dashboard → Settings → Functions → Secrets</strong>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as "tenant" | "company" | "app")}>
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
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
        </TabsList>

        <TabsContent value="tenant" className="space-y-6 mt-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Tenant Integration Credentials</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Krypterte credentials for tenant-brede integrasjoner. Tilgjengelig for alle brukere i denne tenant.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm mb-6">
              <p className="text-blue-800">
                <strong>Når brukes dette?</strong> For sensitive credentials som krever Vault-kryptering, 
                f.eks. OAuth tokens, database-passord, eller tredjepartsintegrasjoner som deles på tvers av hele tenant.
              </p>
            </div>

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
            <p className="text-sm text-muted-foreground mb-4">
              Krypterte credentials for bedriftsspesifikke eksterne systemer.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm mb-6">
              <p className="text-amber-800">
                <strong>Når brukes dette?</strong> For credentials som er spesifikke for én bedrift/selskap, 
                f.eks. ERP-tilgang (Odoo, SAP), regnskapssystem, eller andre bedriftsspesifikke integrasjoner.
              </p>
            </div>

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
            <p className="text-sm text-muted-foreground mb-4">
              Krypterte credentials for applikasjonsspesifikke integrasjoner.
            </p>
            <div className="bg-purple-50 border border-purple-200 rounded-md p-3 text-sm mb-6">
              <p className="text-purple-800">
                <strong>Når brukes dette?</strong> For credentials som er knyttet til én spesifikk app, 
                f.eks. API-nøkler for en bestemt capability eller app-spesifikk tredjepartstjeneste.
              </p>
            </div>

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
