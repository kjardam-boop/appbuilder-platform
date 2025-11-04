import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";

interface SystemScore {
  systemSlug: string;
  systemName: string;
  score: number;
  badges: string[];
}

interface ScoreDetail {
  totalScore: number;
  breakdown: {
    capabilityMatch: { score: number; weight: number; details: any[] };
    integrationReadiness: { score: number; weight: number; details: any[] };
    compliance: { score: number; weight: number; details: any[] };
    ecosystemMaturity: { score: number; weight: number; details: any };
  };
  explain: string[];
  recommendations: string[];
  badges: string[];
}

export default function Compatibility() {
  const [selectedApp, setSelectedApp] = useState<string>("");
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Fetch apps
  const { data: appsData } = useQuery({
    queryKey: ["app-definitions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_definitions")
        .select("key, name")
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
  });

  // Fetch compatibility matrix
  const { data: matrixData, isLoading: matrixLoading } = useQuery({
    queryKey: ["compat-matrix", selectedApp],
    queryFn: async () => {
      if (!selectedApp) return [];
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-compat/matrix?appKey=${selectedApp}`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "X-Request-Id": crypto.randomUUID(),
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch matrix");
      const result = await response.json();
      return result.data as SystemScore[];
    },
    enabled: !!selectedApp,
  });

  // Fetch score detail
  const { data: scoreDetail } = useQuery({
    queryKey: ["compat-score", selectedApp, selectedSystem],
    queryFn: async () => {
      if (!selectedApp || !selectedSystem) return null;
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-compat/score?appKey=${selectedApp}&system=${selectedSystem}`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "X-Request-Id": crypto.randomUUID(),
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch score");
      const result = await response.json();
      return result.data as ScoreDetail;
    },
    enabled: !!selectedApp && !!selectedSystem,
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreVariant = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 50) return "secondary";
    return "destructive";
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Compatibility Matrix</h1>
        <p className="text-muted-foreground">
          Evaluate fit between Platform Apps and External Systems
        </p>
      </div>

      {/* App Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Platform App</CardTitle>
          <CardDescription>Choose an app to see compatibility scores</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedApp} onValueChange={setSelectedApp}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select app..." />
            </SelectTrigger>
            <SelectContent>
              {appsData?.map((app) => (
                <SelectItem key={app.key} value={app.key}>
                  {app.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Compatibility Matrix */}
      {selectedApp && (
        <Card>
          <CardHeader>
            <CardTitle>System Compatibility</CardTitle>
            <CardDescription>
              Fit scores for {appsData?.find((a) => a.key === selectedApp)?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {matrixLoading ? (
              <div>Loading scores...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>System</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Badges</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matrixData?.map((system) => (
                    <TableRow key={system.systemSlug}>
                      <TableCell className="font-medium">{system.systemName}</TableCell>
                      <TableCell>
                        <span className={`text-2xl font-bold ${getScoreColor(system.score)}`}>
                          {system.score}
                        </span>
                        <span className="text-muted-foreground">/100</span>
                      </TableCell>
                      <TableCell className="w-[200px]">
                        <Progress value={system.score} className="h-2" />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {system.badges.map((badge, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {badge}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSystem(system.systemSlug);
                            setDetailOpen(true);
                          }}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Compatibility Details</SheetTitle>
            <SheetDescription>
              {matrixData?.find((s) => s.systemSlug === selectedSystem)?.systemName}
            </SheetDescription>
          </SheetHeader>

          {scoreDetail && (
            <div className="mt-6 space-y-6">
              {/* Total Score */}
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className={`text-5xl font-bold ${getScoreColor(scoreDetail.totalScore)}`}>
                      {scoreDetail.totalScore}
                    </div>
                    <div className="text-muted-foreground mt-2">Total Compatibility Score</div>
                  </div>
                </CardContent>
              </Card>

              {/* Breakdown */}
              <div className="space-y-4">
                <h3 className="font-semibold">Score Breakdown</h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Capability Match ({scoreDetail.breakdown.capabilityMatch.weight * 100}%)</span>
                    <Badge variant={getScoreVariant(scoreDetail.breakdown.capabilityMatch.score)}>
                      {scoreDetail.breakdown.capabilityMatch.score}
                    </Badge>
                  </div>
                  <Progress value={scoreDetail.breakdown.capabilityMatch.score} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Integration Readiness ({scoreDetail.breakdown.integrationReadiness.weight * 100}%)</span>
                    <Badge variant={getScoreVariant(scoreDetail.breakdown.integrationReadiness.score)}>
                      {scoreDetail.breakdown.integrationReadiness.score}
                    </Badge>
                  </div>
                  <Progress value={scoreDetail.breakdown.integrationReadiness.score} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Compliance ({scoreDetail.breakdown.compliance.weight * 100}%)</span>
                    <Badge variant={getScoreVariant(scoreDetail.breakdown.compliance.score)}>
                      {scoreDetail.breakdown.compliance.score}
                    </Badge>
                  </div>
                  <Progress value={scoreDetail.breakdown.compliance.score} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Ecosystem Maturity ({scoreDetail.breakdown.ecosystemMaturity.weight * 100}%)</span>
                    <Badge variant={getScoreVariant(scoreDetail.breakdown.ecosystemMaturity.score)}>
                      {scoreDetail.breakdown.ecosystemMaturity.score}
                    </Badge>
                  </div>
                  <Progress value={scoreDetail.breakdown.ecosystemMaturity.score} />
                </div>
              </div>

              {/* Explanations */}
              {scoreDetail.explain.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Issues Found
                  </h3>
                  <ul className="space-y-1">
                    {scoreDetail.explain.map((exp, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>
                        {exp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {scoreDetail.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Recommendations
                  </h3>
                  <ul className="space-y-1">
                    {scoreDetail.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
