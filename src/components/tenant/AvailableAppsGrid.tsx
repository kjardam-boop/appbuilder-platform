import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Plus, Check, Calendar, Bot } from 'lucide-react';

interface AppDefinition {
  id: string;
  key: string;
  name: string;
  description: string;
  app_type: string;
  icon_name: string;
  is_active: boolean;
}

interface InstalledApp {
  id: string;
  app_definition_id: string | null;
}

interface AvailableAppsGridProps {
  tenantId: string;
  installedApps: InstalledApp[];
  onAppInstalled: () => void;
}

const iconMap: Record<string, any> = {
  Calendar,
  Bot,
};

export function AvailableAppsGrid({ tenantId, installedApps, onAppInstalled }: AvailableAppsGridProps) {
  const [availableApps, setAvailableApps] = useState<AppDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [installingApp, setInstallingApp] = useState<string | null>(null);

  useEffect(() => {
    loadAvailableApps();
  }, []);

  const loadAvailableApps = async () => {
    try {
      const { data, error } = await supabase
        .from('app_definitions')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAvailableApps(data || []);
    } catch (error) {
      console.error('Error loading available apps:', error);
      toast.error('Kunne ikke laste tilgjengelige apper');
    } finally {
      setIsLoading(false);
    }
  };

  const isAppInstalled = (appDefId: string) => {
    return installedApps.some(app => app.app_definition_id === appDefId);
  };

  const handleInstallApp = async (appKey: string, appDefId: string) => {
    setInstallingApp(appKey);
    try {
      // Check if already installed
      const { data: existing } = await supabase
        .from('applications')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('app_definition_id', appDefId)
        .eq('is_active', true)
        .maybeSingle();

      if (existing) {
        toast.info('Applikasjonen er allerede installert');
        return;
      }

      // Install the app
      const { error: createError } = await supabase
        .from('applications')
        .insert({
          tenant_id: tenantId,
          app_definition_id: appDefId,
          app_type: 'utility',
          installed_version: '1.0.0',
          is_active: true,
          status: 'active',
          channel: 'stable',
        });

      if (createError) throw createError;

      toast.success('Applikasjon installert!', {
        description: 'Appen er nå tilgjengelig for brukere'
      });

      onAppInstalled();
    } catch (error) {
      console.error('Failed to install app:', error);
      toast.error('Kunne ikke installere applikasjonen', {
        description: error instanceof Error ? error.message : 'Ukjent feil'
      });
    } finally {
      setInstallingApp(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {availableApps.map((app) => {
        const Icon = iconMap[app.icon_name] || Calendar;
        const installed = isAppInstalled(app.id);
        const installing = installingApp === app.key;

        return (
          <Card key={app.id} className={installed ? 'border-primary' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{app.name}</CardTitle>
                    <Badge variant="outline" className="mt-1">
                      {app.app_type}
                    </Badge>
                  </div>
                </div>
                {installed && (
                  <Badge variant="default" className="ml-2">
                    <Check className="h-3 w-3 mr-1" />
                    Installert
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4 min-h-[3rem]">
                {app.description}
              </CardDescription>
              <Button
                onClick={() => handleInstallApp(app.key, app.id)}
                disabled={installed || installing}
                variant={installed ? 'secondary' : 'default'}
                className="w-full"
                size="sm"
              >
                {installing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Installerer...
                  </>
                ) : installed ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Installert
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Installer
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
