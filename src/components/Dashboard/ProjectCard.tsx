import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Calendar } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface Project {
  id: string;
  title: string;
  description: string | null;
  current_phase: string;
  created_at: string;
  updated_at: string;
}

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

const phaseNames: Record<string, string> = {
  malbilde: "Målbilde",
  markedsdialog: "Markedsdialog",
  invitasjon: "Invitasjon til kontrakt",
  leverandor: "Leverandøroppfølging",
  evaluering: "Evaluering",
};

const ProjectCard = ({ project, onClick }: ProjectCardProps) => {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg">{project.title}</CardTitle>
            <CardDescription className="line-clamp-2">
              {project.description || "Ingen beskrivelse"}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onClick(); }}>
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Fase:</span>
            <Badge variant="secondary">
              {phaseNames[project.current_phase] || project.current_phase}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              Opprettet {format(new Date(project.created_at), "d. MMMM yyyy", { locale: nb })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectCard;
