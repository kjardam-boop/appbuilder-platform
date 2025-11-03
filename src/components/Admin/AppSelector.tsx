import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/hooks/useTenantContext";

interface Application {
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
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const context = useTenantContext();

  useEffect(() => {
    const loadApps = async () => {
      if (!context?.tenant_id) return;
      
      setLoading(true);
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('tenant_id', context.tenant_id)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error loading apps:', error);
      } else {
        setApps(data || []);
      }
      setLoading(false);
    };

    loadApps();
  }, [context?.tenant_id]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Laster applikasjoner...</div>;
  }

  if (apps.length === 0) {
    return <div className="text-sm text-muted-foreground">Ingen aktive applikasjoner</div>;
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Velg applikasjon" />
      </SelectTrigger>
      <SelectContent>
        {apps.map((app) => (
          <SelectItem key={app.key} value={app.key}>
            {app.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
