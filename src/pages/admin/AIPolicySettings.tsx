import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/modules/core/user';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Shield, DollarSign, Zap, AlertTriangle } from 'lucide-react';

export default function AIPolicySettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's tenant_id
  const { data: tenantRole } = useQuery({
    queryKey: ['tenant-role', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('scope_id')
        .eq('user_id', user?.id)
        .eq('scope_type', 'tenant')
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const tenantId = tenantRole?.scope_id;

  // Fetch AI policy
  const { data: policy, isLoading } = useQuery({
    queryKey: ['ai-policy', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_policies')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // Ignore not found
      return data;
    },
    enabled: !!tenantId
  });

  const [formData, setFormData] = useState({
    max_requests_per_hour: policy?.max_requests_per_hour || 100,
    max_requests_per_day: policy?.max_requests_per_day || 1000,
    max_cost_per_day: policy?.max_cost_per_day || 10.00,
    max_cost_per_month: policy?.max_cost_per_month || 100.00,
    alert_threshold_percent: policy?.alert_threshold_percent || 80,
    enable_content_filter: policy?.enable_content_filter ?? true,
    enable_failover: policy?.enable_failover ?? true,
    failover_on_rate_limit: policy?.failover_on_rate_limit ?? true,
    failover_on_error: policy?.failover_on_error ?? true,
  });

  // Update form when policy loads
  useState(() => {
    if (policy) {
      setFormData({
        max_requests_per_hour: policy.max_requests_per_hour,
        max_requests_per_day: policy.max_requests_per_day,
        max_cost_per_day: Number(policy.max_cost_per_day),
        max_cost_per_month: Number(policy.max_cost_per_month),
        alert_threshold_percent: policy.alert_threshold_percent,
        enable_content_filter: policy.enable_content_filter,
        enable_failover: policy.enable_failover,
        failover_on_rate_limit: policy.failover_on_rate_limit,
        failover_on_error: policy.failover_on_error,
      });
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('ai_policies')
        .upsert({
          tenant_id: tenantId,
          ...formData,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-policy'] });
      toast({
        title: 'AI Policy lagret',
        description: 'Dine AI-policyer er oppdatert.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Feil',
        description: error.message || 'Kunne ikke lagre policy',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Laster AI-policyer...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Policy & Governance</h1>
        <p className="text-muted-foreground mt-2">
          Administrer rate limits, kostnadstak og sikkerhet for AI-bruk
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rate Limiting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Rate Limiting
            </CardTitle>
            <CardDescription>
              Begrens antall AI-requests per time og dag
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hourly">Maks requests per time</Label>
              <Input
                id="hourly"
                type="number"
                value={formData.max_requests_per_hour}
                onChange={(e) => setFormData({ ...formData, max_requests_per_hour: parseInt(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Anbefalt: 100-500 for normale brukere
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="daily">Maks requests per dag</Label>
              <Input
                id="daily"
                type="number"
                value={formData.max_requests_per_day}
                onChange={(e) => setFormData({ ...formData, max_requests_per_day: parseInt(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Anbefalt: 1000-5000 for normale brukere
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cost Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Kostnadstak
            </CardTitle>
            <CardDescription>
              Sett maksimal AI-kostnad per dag og måned
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="daily-cost">Maks kostnad per dag ($)</Label>
              <Input
                id="daily-cost"
                type="number"
                step="0.01"
                value={formData.max_cost_per_day}
                onChange={(e) => setFormData({ ...formData, max_cost_per_day: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                AI-kall stoppes når daglig kostnad overstiges
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly-cost">Maks kostnad per måned ($)</Label>
              <Input
                id="monthly-cost"
                type="number"
                step="0.01"
                value={formData.max_cost_per_month}
                onChange={(e) => setFormData({ ...formData, max_cost_per_month: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Totalt månedlig budsjett for AI-bruk
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alert">Varslingsterskel (%)</Label>
              <Input
                id="alert"
                type="number"
                min="0"
                max="100"
                value={formData.alert_threshold_percent}
                onChange={(e) => setFormData({ ...formData, alert_threshold_percent: parseInt(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Varsle når {formData.alert_threshold_percent}% av budsjettet er brukt
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Security & Failover */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Sikkerhet
            </CardTitle>
            <CardDescription>
              Content filtering og sikkerhetskontroller
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Content Filter</Label>
                <p className="text-xs text-muted-foreground">
                  Filter skadelig eller upassende innhold
                </p>
              </div>
              <Switch
                checked={formData.enable_content_filter}
                onCheckedChange={(checked) => setFormData({ ...formData, enable_content_filter: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Failover Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Failover & Redundans
            </CardTitle>
            <CardDescription>
              Automatisk fallback til Lovable AI ved feil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Aktiver Failover</Label>
                <p className="text-xs text-muted-foreground">
                  Bruk Lovable AI som backup
                </p>
              </div>
              <Switch
                checked={formData.enable_failover}
                onCheckedChange={(checked) => setFormData({ ...formData, enable_failover: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Failover ved Rate Limit</Label>
                <p className="text-xs text-muted-foreground">
                  Bytt provider ved rate limiting
                </p>
              </div>
              <Switch
                checked={formData.failover_on_rate_limit}
                onCheckedChange={(checked) => setFormData({ ...formData, failover_on_rate_limit: checked })}
                disabled={!formData.enable_failover}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Failover ved Feil</Label>
                <p className="text-xs text-muted-foreground">
                  Bytt provider ved API-feil
                </p>
              </div>
              <Switch
                checked={formData.failover_on_error}
                onCheckedChange={(checked) => setFormData({ ...formData, failover_on_error: checked })}
                disabled={!formData.enable_failover}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button 
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? 'Lagrer...' : 'Lagre Policy'}
        </Button>
      </div>
    </div>
  );
}
