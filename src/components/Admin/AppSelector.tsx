import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTenantApplications } from "@/hooks/useTenantApplications";
import { useTenantContext } from "@/hooks/useTenantContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Application {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon_name: string | null;
}

interface AppSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export const AppSelector = ({ value, onValueChange, disabled }: AppSelectorProps) => {
  const context = useTenantContext();
  const { data: tenantApps, isLoading: loadingTenant } = useTenantApplications();

  // Fallback: list ALL active apps across tenants when no tenant context or no tenant apps
  const { data: allApps, isLoading: loadingAll } = useQuery({
    queryKey: ["all-applications"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("applications")
        .select(`
          id,
          is_active,
          installed_at,
          app_definition:app_definitions!applications_app_definition_id_fkey(name),
          tenant:tenants!applications_tenant_id_fkey(name)
        `)
        .eq("is_active", true)
        .order("installed_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !context?.tenant_id || !tenantApps || tenantApps.length === 0,
  });

  const loading = loadingTenant || (!tenantApps?.length && loadingAll);

  let appsList: { id: string; name: string }[] = [];
  if (tenantApps && tenantApps.length > 0) {
    appsList = tenantApps.map((a: any) => ({
      id: a.id,
      name: a.app_definition?.name || a.name || "Ukjent applikasjon",
    }));
  } else if (allApps && allApps.length > 0) {
    appsList = allApps.map((a: any) => ({
      id: a.id,
      name: `${a.app_definition?.name ?? "Ukjent applikasjon"}${a.tenant?.name ? ` (${a.tenant.name})` : ""}`,
    }));
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Laster applikasjoner...</div>;
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Velg applikasjon..." />
      </SelectTrigger>
      <SelectContent className="z-50 bg-background">
        {appsList.map((app) => (
          <SelectItem key={app.id} value={app.id}>
            {app.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
