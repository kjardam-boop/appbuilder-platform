import { useNavigate } from "react-router-dom";
import { useUserProjects } from "@/modules/core/project";
import { useCurrentUser } from "@/modules/core/user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, CheckSquare, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { AppBreadcrumbs } from '@/components/ui/app-breadcrumbs';
import { generateAdminBreadcrumbs } from '@/helpers/breadcrumbHelper';

export default function ProjectsHub() {
  const navigate = useNavigate();
  const { currentUser } = useCurrentUser();
  const { projects, isLoading } = useUserProjects(currentUser?.id);

  const activeProjects = projects || [];
  const archivedCount = 0; // Archive functionality to be added

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="container mx-auto p-6 space-y-6">
          <AppBreadcrumbs levels={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Projects" }
          ]} />
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prosjekter</h1>
          <p className="text-muted-foreground">
            Oversikt over alle dine anskaffelsesprosjekter
          </p>
        </div>
        <Button onClick={() => navigate("/dashboard")}>
          <Plus className="h-4 w-4 mr-2" />
          Nytt prosjekt
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktive prosjekter</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProjects.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Åpne oppgaver</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">På tvers av prosjekter</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Arkiverte</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{archivedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Projects */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Aktive prosjekter</h2>
        {activeProjects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Ingen aktive prosjekter</p>
              <p className="text-sm text-muted-foreground mb-4">
                Kom i gang med å opprette ditt første anskaffelsesprosjekt
              </p>
              <Button onClick={() => navigate("/dashboard")}>
                <Plus className="h-4 w-4 mr-2" />
                Opprett prosjekt
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeProjects.map((project) => (
              <Card
                key={project.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/dashboard/project/${project.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {project.description || "Ingen beskrivelse"}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">{project.current_phase}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Opprettet {new Date(project.created_at).toLocaleDateString('nb-NO')}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
