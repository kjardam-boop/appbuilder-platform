import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ApplicationSelectorProps {
  tenantId?: string;
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export const ApplicationSelector = ({ 
  tenantId, 
  value, 
  onValueChange, 
  placeholder = "Velg applikasjon..." 
}: ApplicationSelectorProps) => {
  const { data: applications, isLoading } = useQuery({
    queryKey: ['applications-for-credentials', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('applications')
        .select('id, app_type, subdomain, config, app_definition_id, app_definitions(name)')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Laster applikasjoner...</div>;
  }

  if (!applications || applications.length === 0) {
    return <div className="text-sm text-muted-foreground">Ingen aktive applikasjoner funnet</div>;
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {applications.map((app) => {
          const appName = (app.app_definitions as any)?.name || app.app_type || 'Unknown App';
          const displayName = app.subdomain 
            ? `${appName} (${app.subdomain})` 
            : appName;
          
          return (
            <SelectItem key={app.id} value={app.id}>
              {displayName}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};
