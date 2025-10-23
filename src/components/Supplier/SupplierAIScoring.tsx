import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SupplierEvaluationExport } from "./SupplierEvaluationExport";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Brain, AlertTriangle, HelpCircle, Loader2 } from "lucide-react";
import { AIScoringService } from "@/modules/core/supplier/services/aiScoringService";
import { toast } from "sonner";
import { buildClientContext } from "@/shared/lib/buildContext";

interface SupplierAIScoringProps {
  projectId: string;
  supplierId: string;
  supplierName: string;
}

export const SupplierAIScoring = ({ projectId, supplierId, supplierName }: SupplierAIScoringProps) => {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [scores, setScores] = useState<any[]>([]);
  const [criteria, setCriteria] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [totalScore, setTotalScore] = useState<number>(0);

  useEffect(() => {
    loadData();
  }, [projectId, supplierId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const ctx = await buildClientContext();
      const [scoresData, criteriaData, risksData, questionsData] = await Promise.all([
        AIScoringService.getSupplierScores(ctx, projectId, supplierId),
        AIScoringService.getCriteria(ctx, projectId),
        AIScoringService.getRisks(ctx, projectId, supplierId),
        AIScoringService.getFollowUpQuestions(ctx, projectId, supplierId)
      ]);

      setScores(scoresData);
      setCriteria(criteriaData);
      setRisks(risksData);
      setQuestions(questionsData);

      // Calculate total score
      const total = scoresData.reduce((sum, score) => {
        const crit = criteriaData.find(c => c.id === score.criteria_id);
        return sum + (score.combined_score * (crit?.weight || 0));
      }, 0);
      setTotalScore(total);
    } catch (error) {
      console.error('Error loading AI scoring data:', error);
      toast.error('Kunne ikke laste scoring-data');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const ctx = await buildClientContext();
      await AIScoringService.analyzeSupplier(ctx, projectId, supplierId);
      toast.success('AI-analyse fullført');
      loadData();
    } catch (error) {
      console.error('Error analyzing supplier:', error);
      toast.error('AI-analyse feilet');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{supplierName}</h2>
          <p className="text-muted-foreground">AI-drevet leverandørscoring</p>
        </div>
        <div className="flex items-center gap-4">
          {scores.length > 0 && (
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total score</div>
              <div className="text-3xl font-bold">{totalScore.toFixed(2)}/5.0</div>
            </div>
          )}
          <div className="flex items-center gap-2">
            {scores.length > 0 && (
              <SupplierEvaluationExport 
                projectId={projectId}
                supplierId={supplierId}
                supplierName={supplierName}
              />
            )}
            <Button onClick={handleAnalyze} disabled={analyzing}>
              <Brain className="mr-2 h-4 w-4" />
              {analyzing ? 'Analyserer...' : scores.length > 0 ? 'Analyser på nytt' : 'Start AI-analyse'}
            </Button>
          </div>
        </div>
      </div>

      {scores.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Ingen AI-scoring ennå</p>
            <p className="text-muted-foreground mb-4">
              Klikk på "Start AI-analyse" for å generere en omfattende scoring basert på dokumenter og spørsmålssvar
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="scores" className="w-full">
          <TabsList>
            <TabsTrigger value="scores">Kriterier & Scorer</TabsTrigger>
            <TabsTrigger value="risks">Risikoer ({risks.length})</TabsTrigger>
            <TabsTrigger value="questions">Oppfølging ({questions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="scores" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kriterium</TableHead>
                      <TableHead className="text-center">Vekt</TableHead>
                      <TableHead className="text-center">Dok.</TableHead>
                      <TableHead className="text-center">Spm.</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead>Begrunnelse</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scores.map(score => {
                      const crit = criteria.find(c => c.id === score.criteria_id);
                      return (
                        <TableRow key={score.id}>
                          <TableCell className="font-medium">{crit?.name}</TableCell>
                          <TableCell className="text-center">{crit?.weight.toFixed(2)}</TableCell>
                          <TableCell className="text-center">{score.document_score?.toFixed(1) || '-'}</TableCell>
                          <TableCell className="text-center">{score.questionnaire_score?.toFixed(1) || '-'}</TableCell>
                          <TableCell className="text-center">
                            <Badge>{score.combined_score.toFixed(1)}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-md">{score.justification}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risks" className="space-y-4">
            {risks.map(risk => (
              <Card key={risk.id}>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                    <div className="flex-1">
                      <CardTitle className="text-base">{risk.description}</CardTitle>
                      <div className="flex gap-2 mt-2">
                        <Badge variant={risk.impact === 'critical' ? 'destructive' : 'secondary'}>
                          Konsekvens: {risk.impact}
                        </Badge>
                        <Badge variant="outline">Sannsynlighet: {risk.likelihood}</Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                {risk.mitigation_suggestions && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{risk.mitigation_suggestions}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="questions" className="space-y-4">
            {questions.map(q => (
              <Card key={q.id}>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <HelpCircle className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <CardTitle className="text-base">{q.question}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-2">{q.reason}</p>
                      <Badge variant="outline" className="mt-2">Prioritet: {q.priority}</Badge>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
