import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Bookmark, TrendingUp, Building, Package, Users, Plus } from "lucide-react";
import { useAuth } from "@/modules/core/user/hooks/useAuth";
import { useTenantContext } from "@/hooks/useTenantContext";
import { TenantCompanyAccessService } from "@/modules/core/company/services/tenantCompanyAccessService";
import { useToast } from "@/hooks/use-toast";
import { AppBreadcrumbs } from '@/components/ui/app-breadcrumbs';
import { generateAdminBreadcrumbs } from '@/helpers/breadcrumbHelper';
// Removed CompanySearch import - not needed

export default function CompaniesHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const context = useTenantContext();
  const { toast } = useToast();
  const [showAddExisting, setShowAddExisting] = useState(false);

  const quickActions = [
    {
      title: "Søk bedrifter",
      description: "Søk i Brønnøysundregistrene etter bedrifter",
      icon: Search,
      path: "/admin/companies?tab=search",
      color: "text-blue-600"
    },
    {
      title: "Lagrede bedrifter",
      description: "Se alle bedrifter du har lagret og CRM-data",
      icon: Bookmark,
      path: "/admin/companies",
      color: "text-green-600"
    },
    {
      title: "Muligheter",
      description: "Administrer salgspipeline og muligheter",
      icon: TrendingUp,
      path: "/opportunities",
      color: "text-purple-600"
    },
  ];

  return (
    <div 
    <AppBreadcrumbs levels={generateAdminBreadcrumbs({
  category: "Business",
  currentPage: "Companies"
})} />
    className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Selskaper</h1>
          <p className="text-muted-foreground">
            Administrer bedrifter, kundeforhold og salgsmuligheter
          </p>
        </div>
        
        <Dialog open={showAddExisting} onOpenChange={setShowAddExisting}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Legg til eksisterende selskap
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Velg selskap å legge til i tenant</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">
              {/* Add company search/selection here */}
              <p className="text-sm text-muted-foreground p-4">
                Søk etter selskaper i Brønnøysundregistrene for å legge dem til i din tenant
              </p>
              <Button 
                onClick={() => {
                  setShowAddExisting(false);
                  navigate('/admin/companies?tab=search');
                }}
                className="w-full"
              >
                Gå til søk
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lagrede bedrifter</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktive muligheter</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total pipeline-verdi</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">NOK</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Hurtighandlinger</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <Card
              key={action.path}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(action.path)}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg bg-accent ${action.color}`}>
                    <action.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{action.title}</CardTitle>
                    <CardDescription>{action.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Suppliers Section */}
      <div id="suppliers" className="space-y-4">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold">Systemleverandører og Implementeringspartnere</h2>
        </div>
        <p className="text-muted-foreground mb-4">
          Administrer selskaper som utvikler ERP-systemer og de som implementerer dem
        </p>
        
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Systemleverandører
              </CardTitle>
              <CardDescription>
                Selskaper som utvikler og lisenserer ERP-systemer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate("/system-vendors")}
                className="w-full"
              >
                Se alle systemleverandører
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Implementeringspartnere
              </CardTitle>
              <CardDescription>
                Selskaper som implementerer ERP-systemer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate("/implementation-partners")}
                className="w-full"
              >
                Se alle partnere
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Nylig aktivitet</h2>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Ingen aktivitet ennå</p>
            <p className="text-sm text-muted-foreground mb-4">
              Start med å søke etter bedrifter eller opprette en mulighet
            </p>
            <Button onClick={() => navigate("/admin/companies?tab=search")}>
              <Search className="h-4 w-4 mr-2" />
              Søk bedrifter
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
