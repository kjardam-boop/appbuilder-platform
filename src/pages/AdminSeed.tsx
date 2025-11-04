import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, Users, Loader2, CheckCircle, AlertCircle, Package } from "lucide-react";
import { seedApplications } from "@/modules/core/applications/services/seedApplications";
import { seedAppDefinitions } from "@/modules/core/applications/services/seedAppDefinitions";
import { seedTenants } from "@/modules/core/tenant/services/seedTenants";
import { seedCapabilities } from "@/modules/core/capabilities";
import { seedIndustries } from "@/modules/core/industry/services/seedIndustries";
import { toast } from "sonner";
import Header from "@/components/Dashboard/Header";

export default function AdminSeed() {
  const [isSeeding, setIsSeeding] = useState({
    applications: false,
    platformApps: false,
    tenants: false,
    capabilities: false,
    industries: false,
  });
  const [results, setResults] = useState({
    applications: null as "success" | "error" | null,
    platformApps: null as "success" | "error" | null,
    tenants: null as "success" | "error" | null,
    capabilities: null as "success" | "error" | null,
    industries: null as "success" | "error" | null,
  });

  const handleSeedApplications = async () => {
    setIsSeeding(prev => ({ ...prev, applications: true }));
    setResults(prev => ({ ...prev, applications: null }));

    try {
      await seedApplications();
      setResults(prev => ({ ...prev, applications: "success" }));
      toast.success("Applications seeded successfully!");
    } catch (error) {
      console.error("Seed error:", error);
      setResults(prev => ({ ...prev, applications: "error" }));
      toast.error("Failed to seed applications");
    } finally {
      setIsSeeding(prev => ({ ...prev, applications: false }));
    }
  };

  const handleSeedTenants = async () => {
    setIsSeeding(prev => ({ ...prev, tenants: true }));
    setResults(prev => ({ ...prev, tenants: null }));

    try {
      await seedTenants();
      setResults(prev => ({ ...prev, tenants: "success" }));
      toast.success("Tenants seeded successfully!");
    } catch (error) {
      console.error("Seed error:", error);
      setResults(prev => ({ ...prev, tenants: "error" }));
      toast.error("Failed to seed tenants");
    } finally {
      setIsSeeding(prev => ({ ...prev, tenants: false }));
    }
  };

  const handleSeedCapabilities = async () => {
    setIsSeeding(prev => ({ ...prev, capabilities: true }));
    setResults(prev => ({ ...prev, capabilities: null }));

    try {
      await seedCapabilities();
      setResults(prev => ({ ...prev, capabilities: "success" }));
      toast.success("Capabilities seeded successfully!");
    } catch (error) {
      console.error("Seed error:", error);
      setResults(prev => ({ ...prev, capabilities: "error" }));
      toast.error("Failed to seed capabilities");
    } finally {
      setIsSeeding(prev => ({ ...prev, capabilities: false }));
    }
  };

  const handleSeedIndustries = async () => {
    setIsSeeding(prev => ({ ...prev, industries: true }));
    setResults(prev => ({ ...prev, industries: null }));

    try {
      await seedIndustries();
      setResults(prev => ({ ...prev, industries: "success" }));
      toast.success("Industries seeded successfully!");
    } catch (error) {
      console.error("Seed error:", error);
      setResults(prev => ({ ...prev, industries: "error" }));
      toast.error("Failed to seed industries");
    } finally {
      setIsSeeding(prev => ({ ...prev, industries: false }));
    }
  };

  const handleSeedPlatformApps = async () => {
    setIsSeeding(prev => ({ ...prev, platformApps: true }));
    setResults(prev => ({ ...prev, platformApps: null }));

    try {
      await seedAppDefinitions();
      setResults(prev => ({ ...prev, platformApps: "success" }));
      toast.success("Platform Apps seeded successfully!");
    } catch (error) {
      console.error("Seed error:", error);
      setResults(prev => ({ ...prev, platformApps: "error" }));
      toast.error("Failed to seed Platform Apps");
    } finally {
      setIsSeeding(prev => ({ ...prev, platformApps: false }));
    }
  };

  const handleSeedAll = async () => {
    await handleSeedIndustries();
    await handleSeedApplications();
    await handleSeedPlatformApps();
    await handleSeedCapabilities();
    await handleSeedTenants();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Database Seeding</h1>
            <p className="text-muted-foreground mt-2">
              Populate the database with test data for development and testing.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Seed Applications
              </CardTitle>
              <CardDescription>
                Populate app_vendors, app_products, and SKUs with standard ERP/CRM/EmailSuite systems
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {results.applications && (
                <Alert variant={results.applications === "success" ? "default" : "destructive"}>
                  {results.applications === "success" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    {results.applications === "success"
                      ? "Applications seeded successfully!"
                      : "Failed to seed applications. Check console for details."}
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-4">Includes:</p>
                <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                  <li>• <strong>ERP:</strong> Microsoft D365 BC/FO, SAP S/4HANA, Oracle NetSuite, Visma.net, Unit4, Xledger, IFS, RamBase</li>
                  <li>• <strong>CRM:</strong> HubSpot, Salesforce, Microsoft D365 Sales</li>
                  <li>• <strong>EmailSuite:</strong> Microsoft 365, Google Workspace</li>
                  <li>• Multiple SKUs/editions per product</li>
                </ul>
              </div>

              <Button 
                onClick={handleSeedApplications}
                disabled={isSeeding.applications}
                className="w-full"
              >
                {isSeeding.applications ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Seeding Applications...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Seed Applications
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Seed Test Tenants
              </CardTitle>
              <CardDescription>
                Create 2 test tenants with users and 1 project each
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {results.tenants && (
                <Alert variant={results.tenants === "success" ? "default" : "destructive"}>
                  {results.tenants === "success" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    {results.tenants === "success"
                      ? "Tenants seeded successfully!"
                      : "Failed to seed tenants. Check console for details."}
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-4">Creates:</p>
                <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                  <li>• <strong>Acme Corporation</strong> (acme.example.com) - ERP Replacement Project</li>
                  <li>• <strong>TechStart AS</strong> (techstart subdomain) - CRM Implementation</li>
                  <li>• Users with tenant_owner and tenant_admin roles</li>
                  <li>• One project per tenant</li>
                </ul>
              </div>

              <Button 
                onClick={handleSeedTenants}
                disabled={isSeeding.tenants}
                className="w-full"
              >
                {isSeeding.tenants ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Seeding Tenants...
                  </>
                ) : (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    Seed Tenants
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Seed Platform Apps
              </CardTitle>
              <CardDescription>
                Populate app registry with built-in platform applications (jul25, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {results.platformApps && (
                <Alert variant={results.platformApps === "success" ? "default" : "destructive"}>
                  {results.platformApps === "success" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    {results.platformApps === "success"
                      ? "Platform Apps seeded successfully!"
                      : "Failed to seed Platform Apps. Check console for details."}
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-4">Includes:</p>
                <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                  <li>• <strong>jul25:</strong> Christmas 2025 Planner (family coordination, calendar, tasks)</li>
                  <li>• Domain tables, routes, modules, and extension points</li>
                </ul>
              </div>

              <Button 
                onClick={handleSeedPlatformApps}
                disabled={isSeeding.platformApps}
                className="w-full"
              >
                {isSeeding.platformApps ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Seeding Platform Apps...
                  </>
                ) : (
                  <>
                    <Package className="mr-2 h-4 w-4" />
                    Seed Platform Apps
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Seed Capabilities
              </CardTitle>
              <CardDescription>
                Populate reusable platform capabilities catalog
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {results.capabilities && (
                <Alert variant={results.capabilities === "success" ? "default" : "destructive"}>
                  {results.capabilities === "success" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    {results.capabilities === "success"
                      ? "Capabilities seeded successfully!"
                      : "Failed to seed capabilities. Check console for details."}
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-4">Includes:</p>
                <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                  <li>• AI Text Generation</li>
                  <li>• Task Management</li>
                  <li>• Company Management</li>
                  <li>• Invitation System</li>
                  <li>• Brønnøysund Integration</li>
                  <li>• Calendar View & Presence Tracking (Christmas app)</li>
                </ul>
              </div>

              <Button 
                onClick={handleSeedCapabilities}
                disabled={isSeeding.capabilities}
                className="w-full"
              >
                {isSeeding.capabilities ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Seeding Capabilities...
                  </>
                ) : (
                  <>
                    <Package className="mr-2 h-4 w-4" />
                    Seed Capabilities
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Button 
                onClick={handleSeedAll}
                disabled={Object.values(isSeeding).some(v => v)}
                variant="default"
                size="lg"
                className="w-full"
              >
                {Object.values(isSeeding).some(v => v) ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Seeding...
                  </>
                ) : (
                  "Seed All"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
