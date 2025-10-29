import Header from "@/components/Dashboard/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Database, AlertCircle, Briefcase } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/modules/core/user/hooks/useAuth";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);
  
  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header 
        userName={user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
        userEmail={user?.email}
      />
      
      <main className="container py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Platform overview and quick actions</p>
          </div>
        </div>

        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <CardTitle>Database Not Configured</CardTitle>
            </div>
            <CardDescription>
              The database tables have not been created yet. To enable full functionality, database migrations need to be run.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="shadow-card">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4">
                <Briefcase className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle>Prosjekter</CardTitle>
              <CardDescription>
                Oversikt over alle dine anskaffelsesprosjekter
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/projects">Gå til prosjekter</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4">
                <Building2 className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle>Tenant Management</CardTitle>
              <CardDescription>
                Manage customer instances and configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/tenants">View Tenants</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4">
                <Database className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle>Module Library</CardTitle>
              <CardDescription>
                Browse available platform modules and addons
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/modules">Browse Modules</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
