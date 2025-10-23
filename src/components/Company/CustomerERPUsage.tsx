import { Users, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface CustomerERPUsageProps {
  companyId: string;
}

export function CustomerERPUsage({ companyId }: CustomerERPUsageProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center py-8">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium mb-2">
            ERP-bruk informasjon
          </p>
          <p className="text-xs text-muted-foreground">
            Informasjon om kundens ERP-systemer og bruk kommer snart
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Info className="h-4 w-4" />
            <span>Dette vil vise prosjekter og systemvalg</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
