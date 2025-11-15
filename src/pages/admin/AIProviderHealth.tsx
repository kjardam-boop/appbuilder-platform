import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';
import { AppBreadcrumbs } from '@/components/ui/app-breadcrumbs';
import { generateAdminBreadcrumbs } from '@/helpers/breadcrumbHelper';

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI' },
  { id: 'anthropic', name: 'Anthropic (Claude)' },
  { id: 'google', name: 'Google Gemini' },
  { id: 'azure-openai', name: 'Azure OpenAI' },
  { id: 'lovable', name: 'Lovable AI' },
];

export default function AIProviderHealth() {
  const { data: healthData, isLoading } = useQuery({
    queryKey: ['ai-provider-health'],
    queryFn: async () => {
      const providers = await Promise.all(
        PROVIDERS.map(async (provider) => {
          const { data, error } = await supabase.rpc('get_provider_health', {
            p_provider: provider.id
          });
          
          return {
            ...provider,
            health: data?.[0] || null,
            error
          };
        })
      );
      return providers;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'down':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Activity className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string | null) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'healthy': 'default',
      'degraded': 'secondary',
      'down': 'destructive',
      'unknown': 'outline',
    };

    return (
      <Badge variant={variants[status || 'unknown']}>
        {status || 'Unknown'}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Laster provider status...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Provider Health</h1>
        <p className="text-muted-foreground mt-2">
          Sanntidsstatus for alle AI-leverandører
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {healthData?.map((provider) => (
          <Card key={provider.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(provider.health?.status)}
                  <CardTitle className="text-lg">{provider.name}</CardTitle>
                </div>
                {getStatusBadge(provider.health?.status)}
              </div>
              <CardDescription>
                {provider.health?.last_check_at 
                  ? `Sjekket ${formatDistanceToNow(new Date(provider.health.last_check_at), { 
                      addSuffix: true, 
                      locale: nb 
                    })}`
                  : 'Aldri sjekket'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {provider.health?.response_time_ms && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Response Time</span>
                  </div>
                  <span className="font-medium">{provider.health.response_time_ms}ms</span>
                </div>
              )}

              {provider.health?.error_message && (
                <div className="p-3 bg-destructive/10 rounded-md">
                  <p className="text-xs text-destructive">
                    {provider.health.error_message}
                  </p>
                </div>
              )}

              {!provider.health && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground">
                    Ingen helsesjekk tilgjengelig
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Om Health Monitoring</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Provider health sjekkes automatisk hver 5. minutt. Status oppdateres basert på:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Healthy</strong>: Provider svarer normalt (responstid {'<'} 2s)</li>
            <li><strong>Degraded</strong>: Saktere respons (2-5s) eller sporadiske feil</li>
            <li><strong>Down</strong>: Provider er utilgjengelig eller feiler konsistent</li>
          </ul>
          <p className="pt-2">
            Hvis failover er aktivert i AI Policy, vil systemet automatisk bytte til Lovable AI 
            ved degraded eller down status.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
