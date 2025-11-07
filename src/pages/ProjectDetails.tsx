import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Construction } from "lucide-react";
import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";
import Header from "@/components/Dashboard/Header";

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto py-8 px-4">
        <AppBreadcrumbs levels={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Prosjekter", href: "/projects" },
          { label: "Prosjektdetaljer" }
        ]} />

        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/projects")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Tilbake til prosjekter
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Construction className="h-5 w-5" />
              Under utvikling
            </CardTitle>
            <CardDescription>
              Prosjektdetaljside er under ombygging til ny arkitektur
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Prosjekt ID: {id}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
