import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Bookmark, TrendingUp, Building, Package, Users } from "lucide-react";

export default function CompaniesHub() {
  const navigate = useNavigate();

  const quickActions = [
    {
      title: "Søk bedrifter",
      description: "Søk i Brønnøysundregistrene etter bedrifter",
      icon: Search,
      path: "/company-search",
      color: "text-blue-600"
    },
    {
      title: "Lagrede bedrifter",
      description: "Se alle bedrifter du har lagret og CRM-data",
      icon: Bookmark,
      path: "/saved-companies",
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Selskaper</h1>
          <p className="text-muted-foreground">
            Administrer bedrifter, kundeforhold og salgsmuligheter
          </p>
        </div>
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
                onClick={() => navigate("/systemleverandorer")}
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
                onClick={() => navigate("/implementeringspartnere")}
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
            <Button onClick={() => navigate("/company-search")}>
              <Search className="h-4 w-4 mr-2" />
              Søk bedrifter
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
