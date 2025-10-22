import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Building2, Users, Package, Activity, Plus, Search, MoreVertical } from "lucide-react";

const Tenants = () => {
  const tenants = [
    {
      name: "Acme Corporation",
      domain: "acme.platform.app",
      users: 156,
      apps: 8,
      status: "Active",
      plan: "Enterprise",
    },
    {
      name: "TechStart AS",
      domain: "techstart.platform.app",
      users: 45,
      apps: 3,
      status: "Active",
      plan: "Professional",
    },
    {
      name: "Nordic Industries",
      domain: "nordic.platform.app",
      users: 89,
      apps: 5,
      status: "Active",
      plan: "Enterprise",
    },
    {
      name: "Beta Solutions",
      domain: "beta.platform.app",
      users: 12,
      apps: 2,
      status: "Trial",
      plan: "Trial",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />
      
      <main className="container py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Tenant Management</h1>
            <p className="text-muted-foreground">Manage customer instances and configurations</p>
          </div>
          <Button variant="hero">
            <Plus className="mr-2 h-5 w-5" />
            New Tenant
          </Button>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search tenants..." 
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid gap-6">
          {tenants.map((tenant) => (
            <Card key={tenant.name} className="shadow-card hover:shadow-elevated transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                      <CardTitle>{tenant.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        {tenant.domain}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={tenant.status === "Active" ? "default" : "secondary"}>
                      {tenant.status}
                    </Badge>
                    <Badge variant="outline">{tenant.plan}</Badge>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-8">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{tenant.users}</span>
                    <span className="text-sm text-muted-foreground">Users</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{tenant.apps}</span>
                    <span className="text-sm text-muted-foreground">Apps</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Last active: 2 hours ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Tenants;
