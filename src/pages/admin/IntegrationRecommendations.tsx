import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, TrendingUp, Zap, Shield, Target } from "lucide-react";
import { toast } from "sonner";
import { AppBreadcrumbs } from '@/components/ui/app-breadcrumbs';
import { generateAdminBreadcrumbs } from '@/helpers/breadcrumbHelper';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface Recommendation {
  id: string;
  app_key: string;
  system_product_id: string;
  provider: string;
  score: number;
  breakdown: {
    capability_fit: number;
    integration_readiness: number;
    compliance: number;
    maturity: number;
  };
  explain: Array<{
    category: string;
    message: string;
    impact: string;
  }>;
  suggestions: Array<{
    action: string;
    title: string;
    description: string;
    priority: string;
  }>;
  product?: {
    name: string;
    slug: string;
    vendor: { name: string };
  };
}

export default function IntegrationRecommendations() {
  const { tenantId } = useTenantIsolation();
  const [selectedApp, setSelectedApp] = useState<string>("all");
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [minScore, setMinScore] = useState<string>("0");
  const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);

  // Fetch recommendations
  const { data: recommendations, isLoading, refetch } = useQuery({
    queryKey: ["integration-recommendations", tenantId, selectedApp, selectedProvider],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedApp !== "all") params.append("appKey", selectedApp);
      if (selectedProvider !== "all") params.append("providers", selectedProvider);
      params.append("limit", "50");

      const { data, error } = await supabase.functions.invoke(
        "integration-recommendations",
        {
          method: "GET",
          headers: {
            "x-request-id": crypto.randomUUID(),
          },
        }
      );

      if (error) throw error;
      return data?.data || [];
    },
    enabled: !!tenantId,
  });

  // Refresh mutation
  const refreshMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "integration-recommendations/refresh",
        {
          method: "POST",
          body: { appKeys: selectedApp !== "all" ? [selectedApp] : undefined },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Recommendations refreshed");
      refetch();
    },
    onError: (error: Error) => {
      toast.error("Failed to refresh: " + error.message);
    },
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-yellow-600";
    return "text-gray-600";
  };

  const getProviderBadge = (provider: string) => {
    const colors: Record<string, string> = {
      n8n: "bg-purple-100 text-purple-700",
      pipedream: "bg-blue-100 text-blue-700",
      mcp: "bg-green-100 text-green-700",
      native: "bg-gray-100 text-gray-700",
    };
    return colors[provider] || colors.native;
  };

  const filteredRecs = recommendations
    ?.flatMap((group: any) => group.items)
    .filter((rec: Recommendation) => rec.score >= parseInt(minScore) || 0);

  return (
    <div 
    <AppBreadcrumbs levels={generateAdminBreadcrumbs({
  category: "Integrations",
  currentPage: "Recommendations"
})} />
    className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Integration Recommendations</h1>
          <p className="text-muted-foreground">
            AI-powered suggestions for external system integrations
          </p>
        </div>
        <Button
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
        >
          {refreshMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">App</label>
            <Select value={selectedApp} onValueChange={setSelectedApp}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Apps</SelectItem>
                <SelectItem value="crm">CRM</SelectItem>
                <SelectItem value="erp">ERP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Provider</label>
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                <SelectItem value="n8n">n8n</SelectItem>
                <SelectItem value="pipedream">Pipedream</SelectItem>
                <SelectItem value="mcp">MCP</SelectItem>
                <SelectItem value="native">Native</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Min Score</label>
            <Input
              type="number"
              min="0"
              max="100"
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              placeholder="0"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredRecs?.map((rec: Recommendation) => (
            <Card
              key={rec.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedRec(rec)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      {rec.product?.name || "Unknown System"}
                    </CardTitle>
                    <CardDescription>
                      {rec.product?.vendor?.name || "Unknown Vendor"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getProviderBadge(rec.provider)}>
                      {rec.provider}
                    </Badge>
                    <div className={`text-3xl font-bold ${getScoreColor(rec.score)}`}>
                      {rec.score}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Fit:</span>
                    <span className="font-medium">{rec.breakdown.capability_fit}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Ready:</span>
                    <span className="font-medium">{rec.breakdown.integration_readiness}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Compliance:</span>
                    <span className="font-medium">{rec.breakdown.compliance}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Maturity:</span>
                    <span className="font-medium">{rec.breakdown.maturity}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredRecs?.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No recommendations found. Try adjusting your filters.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Detail Panel */}
      <Sheet open={!!selectedRec} onOpenChange={() => setSelectedRec(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedRec && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedRec.product?.name}</SheetTitle>
                <SheetDescription>
                  Integration recommendation details
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Score Breakdown */}
                <div>
                  <h3 className="font-semibold mb-3">Score Breakdown</h3>
                  <div className="space-y-2">
                    {Object.entries(selectedRec.breakdown).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center">
                        <span className="text-sm capitalize">{key.replace('_', ' ')}</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Explanations */}
                <div>
                  <h3 className="font-semibold mb-3">Why This Recommendation</h3>
                  <div className="space-y-2">
                    {selectedRec.explain.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg ${
                          item.impact === "positive"
                            ? "bg-green-50 text-green-900"
                            : item.impact === "negative"
                            ? "bg-red-50 text-red-900"
                            : "bg-gray-50 text-gray-900"
                        }`}
                      >
                        <p className="text-sm">{item.message}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggestions */}
                {selectedRec.suggestions.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Next Steps</h3>
                    <div className="space-y-2">
                      {selectedRec.suggestions.map((suggestion, idx) => (
                        <Card key={idx}>
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-sm">{suggestion.title}</CardTitle>
                              <Badge variant={
                                suggestion.priority === "high" ? "destructive" :
                                suggestion.priority === "medium" ? "default" : "secondary"
                              }>
                                {suggestion.priority}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pb-3">
                            <p className="text-sm text-muted-foreground">
                              {suggestion.description}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
