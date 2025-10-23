import { useOpportunities } from "@/modules/opportunity";
import { useCurrentUser } from "@/modules/user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, DollarSign } from "lucide-react";
import { useState } from "react";
import { OpportunityDialog } from "@/modules/opportunity/components/OpportunityDialog";
import { OPPORTUNITY_STAGE_LABELS, OPPORTUNITY_STAGE_COLORS, Opportunity } from "@/modules/opportunity/types/opportunity.types";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

export const OpportunitiesWidget = () => {
  const { currentUser } = useCurrentUser();
  const { opportunities, loading } = useOpportunities({ owner_id: currentUser?.id });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);

  const activeOpportunities = opportunities
    .filter(opp => opp.stage !== 'closed_won' && opp.stage !== 'closed_lost')
    .slice(0, 5);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('nb-NO', {
      style: 'currency',
      currency: 'NOK',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mine muligheter</CardTitle>
              <CardDescription>Aktive salgsmuligheter</CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Ny
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : activeOpportunities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>Ingen muligheter ennå</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeOpportunities.map((opportunity) => (
                <div
                  key={opportunity.id}
                  className="p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedOpportunity(opportunity)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{opportunity.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={`text-xs ${OPPORTUNITY_STAGE_COLORS[opportunity.stage]}`}
                        >
                          {OPPORTUNITY_STAGE_LABELS[opportunity.stage]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {opportunity.probability}%
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {opportunity.estimated_value && (
                        <p className="text-sm font-semibold flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {formatCurrency(opportunity.estimated_value)}
                        </p>
                      )}
                      {opportunity.expected_close_date && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(opportunity.expected_close_date), 'dd MMM yyyy', { locale: nb })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {currentUser && (
        <>
          <OpportunityDialog
            open={showCreateDialog}
            onOpenChange={setShowCreateDialog}
            ownerId={currentUser.id}
          />
          
          {selectedOpportunity && (
            <OpportunityDialog
              open={!!selectedOpportunity}
              onOpenChange={(open) => !open && setSelectedOpportunity(null)}
              ownerId={currentUser.id}
              opportunity={selectedOpportunity}
            />
          )}
        </>
      )}
    </>
  );
};
