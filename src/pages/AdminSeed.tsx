import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, Users, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { seedApplications } from "@/modules/core/applications/services/seedApplications";
import { seedTenants } from "@/modules/core/tenant/services/seedTenants";
import { toast } from "sonner";
import Header from "@/components/Dashboard/Header";

export default function AdminSeed() {
  const [isSeeding, setIsSeeding] = useState({
    applications: false,
    tenants: false,
  });
  const [results, setResults] = useState({
    applications: null as "success" | "error" | null,
    tenants: null as "success" | "error" | null,
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

  const handleSeedAll = async () => {
    await handleSeedApplications();
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
            <CardContent className="pt-6">
              <Button 
                onClick={handleSeedAll}
                disabled={isSeeding.applications || isSeeding.tenants}
                variant="default"
                size="lg"
                className="w-full"
              >
                {isSeeding.applications || isSeeding.tenants ? (
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
