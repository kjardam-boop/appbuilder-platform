import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/modules/core/user';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Brain, TrendingUp, DollarSign, Activity } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AIUsageDashboard() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<'7' | '30' | '90'>('30');

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
  const startDate = startOfDay(subDays(new Date(), parseInt(timeRange)));

  // Fetch AI usage logs
  const { data: usageLogs, isLoading } = useQuery({
    queryKey: ['ai-usage', tenantId, timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId
  });

  // Calculate statistics
  const stats = {
    totalCalls: usageLogs?.length || 0,
    totalTokens: usageLogs?.reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0,
    totalCost: usageLogs?.reduce((sum, log) => sum + parseFloat(String(log.cost_estimate || 0)), 0) || 0,
    successRate: usageLogs?.length 
      ? (usageLogs.filter(log => log.status === 'success').length / usageLogs.length) * 100 
      : 0,
  };

  // Group by provider
  const providerData = Object.entries(
    usageLogs?.reduce((acc: Record<string, number>, log) => {
      acc[log.provider] = (acc[log.provider] || 0) + 1;
      return acc;
    }, {}) || {}
  ).map(([name, value]) => ({ name, value }));

  // Group by model
  const modelData = Object.entries(
    usageLogs?.reduce((acc: Record<string, { calls: number; tokens: number; cost: number }>, log) => {
      if (!acc[log.model]) {
        acc[log.model] = { calls: 0, tokens: 0, cost: 0 };
      }
      acc[log.model].calls += 1;
      acc[log.model].tokens += log.total_tokens || 0;
      acc[log.model].cost += parseFloat(String(log.cost_estimate || 0));
      return acc;
    }, {}) || {}
  ).map(([name, data]) => ({ name, ...data }));

  // Daily usage trend
  const dailyData = Object.entries(
    usageLogs?.reduce((acc: Record<string, { calls: number; cost: number }>, log) => {
      const date = format(new Date(log.created_at), 'MMM dd');
      if (!acc[date]) {
        acc[date] = { calls: 0, cost: 0 };
      }
      acc[date].calls += 1;
      acc[date].cost += parseFloat(String(log.cost_estimate || 0));
      return acc;
    }, {}) || {}
  ).map(([date, data]) => ({ date, ...data }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Laster AI-statistikk...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Usage Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Oversikt over AI-bruk og kostnader for din tenant
          </p>
        </div>

        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Siste 7 dager</SelectItem>
            <SelectItem value="30">Siste 30 dager</SelectItem>
            <SelectItem value="90">Siste 90 dager</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total AI Calls</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCalls.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              AI requests siste {timeRange} dager
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTokens.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {(stats.totalTokens / 1000).toFixed(1)}K tokens prosessert
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimert Kostnad</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalCost.toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">
              Basert på provider pricing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Vellykkede AI-kall
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">Daglig bruk</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="models">Modeller</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Calls & Cost Over Time</CardTitle>
              <CardDescription>Daglig trend for AI-bruk og estimert kostnad</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line 
                    yAxisId="left" 
                    type="monotone" 
                    dataKey="calls" 
                    stroke="#8884d8" 
                    name="AI Calls" 
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="cost" 
                    stroke="#82ca9d" 
                    name="Cost ($)" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="providers" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Usage by Provider</CardTitle>
                <CardDescription>Fordeling av AI-kall per provider</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={providerData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {providerData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Provider Statistics</CardTitle>
                <CardDescription>Detaljert oversikt per provider</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {providerData.map((provider, index) => (
                    <div key={provider.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium capitalize">{provider.name}</span>
                      </div>
                      <span className="text-muted-foreground">{provider.value} calls</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Model Usage & Cost</CardTitle>
              <CardDescription>Sammenligning av modeller basert på bruk og kostnad</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={modelData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="calls" fill="#8884d8" name="Calls" />
                  <Bar yAxisId="right" dataKey="cost" fill="#82ca9d" name="Cost ($)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Token Usage by Model</CardTitle>
              <CardDescription>Total tokens prosessert per modell</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {modelData.map((model) => (
                  <div key={model.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{model.name}</span>
                      <span className="text-muted-foreground">
                        {model.tokens.toLocaleString()} tokens
                      </span>
                    </div>
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-primary h-full transition-all"
                        style={{ 
                          width: `${(model.tokens / Math.max(...modelData.map(m => m.tokens))) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
