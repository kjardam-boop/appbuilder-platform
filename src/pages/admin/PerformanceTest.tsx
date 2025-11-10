import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PlayCircle, CheckCircle2, XCircle } from "lucide-react";
import { performanceAnalyzer } from "@/modules/core/applications/services/__tests__/performance-analysis";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function PerformanceTest() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTests = async () => {
    setIsRunning(true);
    setError(null);
    setResults(null);

    try {
      // Get first product for testing
      const productResult = await supabase
        .from("app_products" as any)
        .select("id")
        .limit(1)
        .maybeSingle();

      if (productResult.error) throw productResult.error;

      // Get first tenant for testing
      const tenantResult = await supabase
        .from("tenants" as any)
        .select("id")
        .limit(1)
        .maybeSingle();

      if (tenantResult.error) throw tenantResult.error;

      const productId = productResult.data ? (productResult.data as any).id : undefined;
      const tenantId = tenantResult.data ? (tenantResult.data as any).id : undefined;

      // Capture console output
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        logs.push(args.join(" "));
        originalLog(...args);
      };

      // Run performance tests
      await performanceAnalyzer.runAll({
        productId,
        tenantId,
        capability: "create_contact",
      });

      // Restore console.log
      console.log = originalLog;

      // Generate report
      const report = performanceAnalyzer.generateReport();
      
      setResults([...logs, report].join("\n"));
      toast.success("Performance-test fullført!");
    } catch (err) {
      console.error("Performance test error:", err);
      setError(err instanceof Error ? err.message : "Ukjent feil");
      toast.error("Performance-test feilet");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Performance Test</h1>
        <p className="text-muted-foreground mt-2">
          Test ytelsen til database views vs direkte queries
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Database Views Performance Analysis</CardTitle>
          <CardDescription>
            Denne testen sammenligner ytelsen mellom direkte table queries og optimaliserte database views.
            Testen kjører flere scenarioer og måler eksekveringstid, antall queries og dataoverføring.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={runTests}
              disabled={isRunning}
              size="lg"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kjører test...
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Start Performance Test
                </>
              )}
            </Button>

            {results && (
              <div className="flex items-center text-green-600 dark:text-green-400">
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Test fullført
              </div>
            )}

            {error && (
              <div className="flex items-center text-destructive">
                <XCircle className="mr-2 h-5 w-5" />
                Test feilet
              </div>
            )}
          </div>

          {error && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Feil</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm whitespace-pre-wrap">{error}</pre>
              </CardContent>
            </Card>
          )}

          {results && (
            <Card>
              <CardHeader>
                <CardTitle>Resultater</CardTitle>
                <CardDescription>
                  Performance-analyse av database views
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="text-xs whitespace-pre-wrap font-mono bg-muted p-4 rounded-lg overflow-x-auto">
                  {results}
                </pre>
              </CardContent>
            </Card>
          )}

          {!results && !error && !isRunning && (
            <Card className="bg-muted">
              <CardContent className="pt-6">
                <div className="space-y-2 text-sm">
                  <p className="font-medium">Testen vil kjøre følgende scenarioer:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Liste alle produkter (med vendor/category joins)</li>
                    <li>Hent produkt med full detaljer (SKUs, integrations, ERP)</li>
                    <li>Finn systemer etter capability (MCP actions)</li>
                    <li>Liste tenant-systemer med detaljer</li>
                    <li>Aggreger tenant system-sammendrag</li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    For hvert scenario måles både direkte queries og optimaliserte views,
                    og resultatene vises med forbedringsprosent.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Forventede resultater</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-semibold mb-2">Views fordeler:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>⚡ 15-70% raskere (avhengig av kompleksitet)</li>
                <li>🔄 Betydelig færre queries (opptil 75% reduksjon)</li>
                <li>📦 Mindre data over network</li>
                <li>🎯 Konsistente aliaser (ingen mapping)</li>
                <li>📊 Server-side aggregering</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Test-scenarioer:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Simple queries: 15-25% forbedring</li>
                <li>Multiple joins: 30-50% forbedring</li>
                <li>Kompleks aggregering: 50-70% forbedring</li>
                <li>Redusert query count: 4 queries → 1 query</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
