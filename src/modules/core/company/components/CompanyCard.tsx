import { Building2, Users, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Company } from "../types/company.types";

interface CompanyCardProps {
  company: Company;
  onClick?: () => void;
  showDetails?: boolean;
}

export const CompanyCard = ({ company, onClick, showDetails = true }: CompanyCardProps) => {
  return (
    <Card 
      className={`hover:shadow-lg transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-xl">{company.name}</CardTitle>
              <p className="text-sm text-muted-foreground">Org.nr: {company.org_number}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      
      {showDetails && (
        <CardContent className="space-y-3">
          {company.industry_description && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Bransje</p>
              <p className="text-sm">{company.industry_description}</p>
            </div>
          )}
          
          <div className="flex items-center gap-4 text-sm">
            {company.employees && (
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{company.employees} ansatte</span>
              </div>
            )}
            
            {company.website && (
              <div className="flex items-center gap-1">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a 
                  href={company.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Nettside
                </a>
              </div>
            )}
          </div>

          {company.founding_date && (
            <div className="text-xs text-muted-foreground">
              Stiftet: {format(new Date(company.founding_date), "d. MMMM yyyy", { locale: nb })}
            </div>
          )}

          {company.is_saved && (
            <Badge variant="secondary">Lagret</Badge>
          )}
        </CardContent>
      )}
    </Card>
  );
};
