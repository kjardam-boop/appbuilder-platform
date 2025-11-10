import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, Briefcase, FolderKanban, AlertCircle, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";

export default function AdminDashboard() {
  // Fetch platform statistics
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [
        { count: tenantCount },
        { count: userCount },
        { count: companyCount },
        { count: projectCount },
        { count: appProductCount },
      ] = await Promise.all([
        supabase.from('tenants').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('companies').select('id', { count: 'exact', head: true }),
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        (supabase as any).from('external_systems').select('id', { count: 'exact', head: true }),
      ]);

      return {
        tenants: tenantCount || 0,
        users: userCount || 0,
        companies: companyCount || 0,
        projects: projectCount || 0,
        appProducts: appProductCount || 0,
      };
    },
  });

  // Fetch recent activity from audit logs
  const { data: recentActivity } = useQuery({
    queryKey: ['admin-recent-activity'],
    queryFn: async () => {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const statCards = [
    {
      title: "Total Tenants",
      value: stats?.tenants,
      description: "Active tenant instances",
      icon: Building2,
      color: "text-blue-600",
    },
    {
      title: "Platform Users",
      value: stats?.users,
      description: "Registered users across all tenants",
      icon: Users,
      color: "text-green-600",
    },
    {
      title: "Companies",
      value: stats?.companies,
      description: "Companies in the system",
      icon: Briefcase,
      color: "text-purple-600",
    },
    {
      title: "Active Projects",
      value: stats?.projects,
      description: "Projects across all tenants",
      icon: FolderKanban,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-6">
      <AppBreadcrumbs levels={[
        { label: "Admin", href: "/admin" },
        { label: "Dashboard" }
      ]} />
      
      <div>
        <h1 className="text-3xl font-bold">Platform Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview of your multi-tenant platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* System Health & Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              System Status
            </CardTitle>
            <CardDescription>Platform health overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Database</span>
              <span className="text-sm font-medium text-green-600">Operational</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Authentication</span>
              <span className="text-sm font-medium text-green-600">Operational</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Applications</span>
              <span className="text-sm font-medium">{stats?.appProducts || 0} registered</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest platform events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {recentActivity && recentActivity.length > 0 ? (
                recentActivity.slice(0, 5).map((log) => (
                  <div key={log.id} className="text-sm border-l-2 border-muted pl-3 py-1">
                    <div className="font-medium">{log.action}</div>
                    <div className="text-xs text-muted-foreground">
                      {log.resource} • {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-3">
            <a
              href="/admin/tenants"
              className="p-4 border rounded-lg hover:bg-muted transition-colors"
            >
              <Building2 className="h-6 w-6 mb-2 text-primary" />
              <h3 className="font-medium">Manage Tenants</h3>
              <p className="text-sm text-muted-foreground">Create and configure tenants</p>
            </a>
            <a
              href="/admin/users"
              className="p-4 border rounded-lg hover:bg-muted transition-colors"
            >
              <Users className="h-6 w-6 mb-2 text-primary" />
              <h3 className="font-medium">Manage Users</h3>
              <p className="text-sm text-muted-foreground">Add and manage user roles</p>
            </a>
            <a
              href="/admin/database"
              className="p-4 border rounded-lg hover:bg-muted transition-colors"
            >
              <Activity className="h-6 w-6 mb-2 text-primary" />
              <h3 className="font-medium">Database Tools</h3>
              <p className="text-sm text-muted-foreground">Seed data and run queries</p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
