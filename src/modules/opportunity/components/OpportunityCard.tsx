import { Building2, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OpportunityStageBadge } from './OpportunityStageBadge';
import type { Opportunity } from '../types/opportunity.types';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

interface OpportunityCardProps {
  opportunity: Opportunity;
  companyName?: string;
  onClick?: () => void;
}

export function OpportunityCard({ opportunity, companyName, onClick }: OpportunityCardProps) {
  const probabilityAdjustedValue = opportunity.estimated_value 
    ? (opportunity.estimated_value * opportunity.probability) / 100 
    : 0;

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium line-clamp-1">{opportunity.title}</h3>
          <OpportunityStageBadge stage={opportunity.stage} />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {opportunity.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {opportunity.description}
          </p>
        )}

        {companyName && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span className="line-clamp-1">{companyName}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-sm">
          {opportunity.estimated_value && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-green-600" />
              <span className="text-xs">
                {(opportunity.estimated_value / 1000).toFixed(0)}k
              </span>
            </div>
          )}

          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-blue-600" />
            <span className="text-xs">{opportunity.probability}%</span>
          </div>

          {opportunity.expected_close_date && (
            <div className="flex items-center gap-1 col-span-2 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span className="text-xs">
                {format(new Date(opportunity.expected_close_date), 'dd MMM yyyy', { locale: nb })}
              </span>
            </div>
          )}
        </div>

        {probabilityAdjustedValue > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Vektet verdi:</span>
              <span className="font-medium">
                {(probabilityAdjustedValue / 1000).toFixed(0)}k NOK
              </span>
            </div>
          </div>
        )}

        {opportunity.next_step && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Neste steg:</span> {opportunity.next_step}
          </div>
        )}

        {opportunity.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {opportunity.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {opportunity.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{opportunity.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
