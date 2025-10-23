import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, FileText, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface RelatedEntitiesLinksProps {
  companyId: string;
  companyName: string;
}

interface Project {
  id: string;
  title: string;
  current_phase: string;
}

interface Opportunity {
  id: string;
  title: string;
  stage: string;
  estimated_value: number;
}

export function RelatedEntitiesLinks({ companyId, companyName }: RelatedEntitiesLinksProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRelatedEntities();
  }, [companyId]);

  const fetchRelatedEntities = async () => {
    setIsLoading(true);
    try {
      // Fetch projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, title, current_phase')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      // Fetch opportunities
      const { data: opportunitiesData } = await supabase
        .from('opportunities')
        .select('id, title, stage, estimated_value')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      setProjects(projectsData || []);
      setOpportunities(opportunitiesData || []);
    } catch (error) {
      console.error('Error fetching related entities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const phaseNames: Record<string, string> = {
    malbilde: "Målbilde",
    markedsdialog: "Markedsdialog",
    invitasjon: "Invitasjon",
    leverandor: "Leverandøroppfølging",
    evaluering: "Evaluering",
  };

  const stageNames: Record<string, string> = {
    prospecting: "Prospektering",
    qualification: "Kvalifisering",
    proposal: "Tilbud",
    negotiation: "Forhandling",
    closed_won: "Vunnet",
    closed_lost: "Tapt",
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasData = projects.length > 0 || opportunities.length > 0;

  if (!hasData) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Relaterte prosjekter og muligheter
        </CardTitle>
        <CardDescription>
          Prosjekter og salgsmuligheter knyttet til {companyName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {projects.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>Prosjekter ({projects.length})</span>
            </div>
            <div className="space-y-2">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  to={`/project/${project.id}`}
                  className="block p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{project.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {phaseNames[project.current_phase] || project.current_phase}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {opportunities.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>Salgsmuligheter ({opportunities.length})</span>
            </div>
            <div className="space-y-2">
              {opportunities.map((opp) => (
                <Link
                  key={opp.id}
                  to={`/opportunities/${opp.id}`}
                  className="block p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{opp.title}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        opp.stage === 'closed_won' && "bg-green-500/10 text-green-700 dark:text-green-400",
                        opp.stage === 'closed_lost' && "bg-red-500/10 text-red-700 dark:text-red-400"
                      )}
                    >
                      {stageNames[opp.stage] || opp.stage}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {opp.estimated_value ? `${opp.estimated_value.toLocaleString('nb-NO')} kr` : ''}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
