import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  ExternalLink, 
  Building2, 
  Calendar,
  ArrowRight,
  FileText,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { PageHeader } from '@/components/shared';

interface AppProject {
  id: string;
  name: string;
  description: string | null;
  company_id: string | null;
  workshop_status: string;
  miro_board_url: string | null;
  notion_page_url: string | null;
  created_at: string;
  company?: {
    name: string;
    org_number: string | null;
  } | null;
}

const workshopStatusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  'not_started': { label: 'Ikke startet', variant: 'outline' },
  'preparing': { label: 'Forbereder', variant: 'secondary' },
  'board_ready': { label: 'Board klar', variant: 'secondary' },
  'in_progress': { label: 'Pågår', variant: 'default' },
  'complete': { label: 'Fullført', variant: 'default' },
  'processed': { label: 'Prosessert', variant: 'default' },
};

export default function AppProjects() {
  const navigate = useNavigate();

  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['customer-app-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_app_projects')
        .select(`
          *,
          company:companies(name, org_number)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AppProject[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-destructive">Kunne ikke laste prosjekter: {(error as Error).message}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="App-prosjekter"
        description="Prosjekter opprettet via App Creation Wizard"
        actions={
          <Button onClick={() => navigate('/admin/apps/wizard')}>
            <Plus className="mr-2 h-4 w-4" />
            Nytt prosjekt
          </Button>
        }
      />

      {projects?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Ingen prosjekter ennå</h3>
            <p className="text-muted-foreground mb-4">
              Opprett ditt første app-prosjekt med wizarden
            </p>
            <Button onClick={() => navigate('/admin/apps/wizard')}>
              <Plus className="mr-2 h-4 w-4" />
              Start App Wizard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects?.map((project) => {
            const status = workshopStatusLabels[project.workshop_status] || { 
              label: project.workshop_status, 
              variant: 'outline' as const 
            };

            return (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      {project.company && (
                        <CardDescription className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {project.company.name}
                        </CardDescription>
                      )}
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(project.created_at), 'PPP', { locale: nb })}
                  </div>

                  {/* External links row */}
                  {(project.miro_board_url || project.notion_page_url) && (
                    <div className="flex flex-wrap gap-2">
                      {project.miro_board_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={project.miro_board_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-1 h-3 w-3" />
                            Miro
                          </a>
                        </Button>
                      )}
                      {project.notion_page_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={project.notion_page_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-1 h-3 w-3" />
                            Notion
                          </a>
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Action buttons row */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    {project.workshop_status === 'processed' ? (
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => navigate(`/admin/apps/preview/${project.id}`)}
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        Preview
                      </Button>
                    ) : (
                      <div />
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate(`/admin/apps/wizard?project=${project.id}`)}
                    >
                      Fortsett
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

