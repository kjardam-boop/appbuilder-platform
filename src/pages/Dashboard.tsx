import { Header } from "@/components/layout/Header";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Package, Users, Activity, Plus, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const stats = [
    {
      title: "Active Tenants",
      value: 12,
      icon: Building2,
      trend: "+2 this month",
      description: "Customer instances",
    },
    {
      title: "Deployed Apps",
      value: 28,
      icon: Package,
      trend: "+5 this week",
      description: "Live applications",
    },
    {
      title: "Total Users",
      value: 1847,
      icon: Users,
      trend: "+124 this month",
      description: "Across all tenants",
    },
    {
      title: "System Health",
      value: "99.8%",
      icon: Activity,
      trend: "All systems operational",
      description: "Uptime",
    },
  ];

  const recentProjects = [
    { name: "ERP Integration Hub", tenant: "Acme Corp", status: "In Progress", modules: 5 },
    { name: "CRM Analytics Dashboard", tenant: "TechStart", status: "Deployed", modules: 3 },
    { name: "Document Management", tenant: "Nordic AS", status: "Planning", modules: 4 },
  ];

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />
      
      <main className="container py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Platform Dashboard</h1>
            <p className="text-muted-foreground">Manage and monitor your customer applications</p>
          </div>
          <Button variant="hero" size="lg">
            <Plus className="mr-2 h-5 w-5" />
            New Project
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatsCard key={stat.title} {...stat} />
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>Latest customer application projects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentProjects.map((project) => (
                  <div key={project.name} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                      <h4 className="font-medium">{project.name}</h4>
                      <p className="text-sm text-muted-foreground">{project.tenant} • {project.modules} modules</p>
                    </div>
                    <Badge variant={project.status === "Deployed" ? "default" : "secondary"}>
                      {project.status}
                    </Badge>
                  </div>
                ))}
                <Link to="/dashboard/projects">
                  <Button variant="ghost" className="w-full">
                    View All Projects
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common platform tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/tenants">
                  <Building2 className="mr-2 h-4 w-4" />
                  Manage Tenants
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/modules">
                  <Package className="mr-2 h-4 w-4" />
                  Browse Modules
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Activity className="mr-2 h-4 w-4" />
                System Monitoring
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                User Management
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

// Missing import for Badge
import { Badge } from "@/components/ui/badge";

export default Dashboard;
