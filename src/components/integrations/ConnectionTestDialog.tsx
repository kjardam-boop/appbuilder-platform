import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ConnectionTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  externalSystemId: string;
  integrationName: string;
  credentials?: Record<string, string>;
  config?: Record<string, any>;
}

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
  responseTime?: number;
}

export function ConnectionTestDialog({
  open,
  onOpenChange,
  companyId,
  externalSystemId,
  integrationName,
  credentials = {},
  config = {},
}: ConnectionTestDialogProps) {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-integration-connection', {
        body: {
          companyId,
          externalSystemId,
          credentials,
          config,
        },
      });

      if (error) throw error;

      setTestResult(data as TestResult);

      if (data.success) {
        toast({
          title: "Tilkobling vellykket",
          description: `${integrationName} svarte på ${data.responseTime}ms`,
        });
      } else {
        toast({
          title: "Tilkobling feilet",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Test error:", error);
      const errorResult: TestResult = {
        success: false,
        message: error instanceof Error ? error.message : "Ukjent feil ved testing",
      };
      setTestResult(errorResult);
      toast({
        title: "Test feilet",
        description: errorResult.message,
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const hasCredentials = Object.keys(credentials).length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Test tilkobling</DialogTitle>
          <DialogDescription>
            Verifiser at API-nøkler og konfigurasjon fungerer for {integrationName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!hasCredentials && (
            <Alert>
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                Ingen API-nøkler er konfigurert. Legg til credentials først.
              </AlertDescription>
            </Alert>
          )}

          {testResult && (
            <Alert variant={testResult.success ? "default" : "destructive"}>
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">{testResult.message}</p>
                  {testResult.responseTime && (
                    <p className="text-xs text-muted-foreground">
                      Svartid: {testResult.responseTime}ms
                    </p>
                  )}
                  {testResult.details && (
                    <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto max-h-32">
                      {JSON.stringify(testResult.details, null, 2)}
                    </pre>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {!testResult && !isTesting && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <div className="text-center space-y-2">
                <Zap className="h-12 w-12 mx-auto opacity-50" />
                <p className="text-sm">Klar til å teste tilkoblingen</p>
              </div>
            </div>
          )}

          {isTesting && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Tester tilkobling...</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Lukk
          </Button>
          <Button
            onClick={handleTest}
            disabled={isTesting || !hasCredentials}
          >
            {isTesting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Tester...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Test tilkobling
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
