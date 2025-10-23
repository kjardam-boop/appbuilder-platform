import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOpportunities } from "@/modules/opportunity";
import { useCurrentUser } from "@/modules/user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, DollarSign, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { OpportunityCard } from "@/modules/opportunity";
import { OpportunityDialog } from "@/modules/opportunity";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { OpportunityStage } from "@/modules/opportunity";

export default function OpportunitiesPage() {
  const navigate = useNavigate();
  const { currentUser } = useCurrentUser();
  const { opportunities, loading } = useOpportunities({ owner_id: currentUser?.id });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedStage, setSelectedStage] = useState<OpportunityStage | "all">("all");

  const filteredOpportunities = selectedStage === "all" 
    ? opportunities
    : opportunities.filter(opp => opp.stage === selectedStage);

  const activeOpportunities = opportunities.filter(
    opp => !['closed_won', 'closed_lost'].includes(opp.stage)
  );

  const totalValue = activeOpportunities.reduce((sum, opp) => 
    sum + (opp.estimated_value || 0), 0
  );

  const totalWeightedValue = activeOpportunities.reduce((sum, opp) => 
    sum + ((opp.estimated_value || 0) * opp.probability / 100), 0
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Muligheter</h1>
          <p className="text-muted-foreground">
            Administrer salgspipeline og track muligheter
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ny mulighet
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktive muligheter</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeOpportunities.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total pipeline-verdi</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalValue.toLocaleString('nb-NO')} kr
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vektet verdi</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalWeightedValue.toLocaleString('nb-NO')} kr
            </div>
            <p className="text-xs text-muted-foreground">Basert på sannsynlighet</p>
          </CardContent>
        </Card>
      </div>

      {/* Opportunities List */}
      <Tabs value={selectedStage} onValueChange={(v) => setSelectedStage(v as OpportunityStage | "all")}>
        <TabsList>
          <TabsTrigger value="all">Alle</TabsTrigger>
          <TabsTrigger value="prospecting">Prospektering</TabsTrigger>
          <TabsTrigger value="qualification">Kvalifisering</TabsTrigger>
          <TabsTrigger value="proposal">Tilbud</TabsTrigger>
          <TabsTrigger value="negotiation">Forhandling</TabsTrigger>
          <TabsTrigger value="closed_won">Vunnet</TabsTrigger>
          <TabsTrigger value="closed_lost">Tapt</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedStage} className="space-y-4">
          {filteredOpportunities.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Ingen muligheter</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Opprett din første salgsmulighet for å komme i gang
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Opprett mulighet
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredOpportunities.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  companyName={(opportunity as any).company?.name}
                  onClick={() => navigate(`/opportunities/${opportunity.id}`)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {currentUser && (
        <OpportunityDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          ownerId={currentUser.id}
        />
      )}
    </div>
  );
}
