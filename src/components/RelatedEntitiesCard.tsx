/**
 * Related Entities Card
 * Shows related tasks, documents, and other entities for a given entity
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckSquare, Link as LinkIcon } from "lucide-react";

interface RelatedEntitiesCardProps {
  entityType: "opportunity" | "project" | "company" | "supplier";
  entityId: string;
}

export const RelatedEntitiesCard = ({ entityType, entityId }: RelatedEntitiesCardProps) => {
  // TODO: Fetch related entities from database
  // For now, show a placeholder

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <LinkIcon className="h-4 w-4" />
          Relaterte ressurser
        </CardTitle>
        <CardDescription>
          Oppgaver, dokumenter og andre relaterte elementer
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            <span>Ingen relaterte oppgaver ennå</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Ingen relaterte dokumenter ennå</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
