import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Play, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock,
  FileJson,
  AlertCircle,
  Copy,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface McpRegistryEntry {
  id: string;
  tenant_id: string;
  app_key: string;
  action_key: string;
  fq_action: string;
  version: string;
  description?: string;
  input_schema?: any;
  output_schema?: any;
  enabled: boolean;
  created_at: string;
  created_by: string;
}

interface TestMcpActionDialogProps {
  action: McpRegistryEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  duration_ms?: number;
  timestamp: string;
}

export function TestMcpActionDialog({
  action,
  open,
  onOpenChange,
}: TestMcpActionDialogProps) {
  const [payloadJson, setPayloadJson] = useState(
    action.input_schema 
      ? JSON.stringify(generateExamplePayload(action.input_schema), null, 2)
      : "{}"
  );
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Test MCP action mutation
  const testMutation = useMutation({
    mutationFn: async (payload: any) => {
      const startTime = Date.now();
      
      try {
        // Call edge function to execute MCP action
        const { data, error } = await supabase.functions.invoke('execute-mcp-action', {
          body: {
            tenant_id: action.tenant_id,
            fq_action: action.fq_action,
            version: action.version,
            payload: payload,
          },
        });

        const duration = Date.now() - startTime;

        if (error) throw error;

        return {
          success: true,
          data,
          duration_ms: duration,
          timestamp: new Date().toISOString(),
        };
      } catch (error: any) {
        const duration = Date.now() - startTime;
        return {
          success: false,
          error: error.message || 'Unknown error',
          duration_ms: duration,
          timestamp: new Date().toISOString(),
        };
      }
    },
    onSuccess: (result) => {
      setTestResult(result);
      if (result.success) {
        toast.success("Test kjørt vellykket");
      } else {
        toast.error("Test feilet");
      }
    },
    onError: (error: any) => {
      console.error("Test failed:", error);
      setTestResult({
        success: false,
        error: error.message || 'Failed to execute test',
        timestamp: new Date().toISOString(),
      });
      toast.error("Kunne ikke kjøre test");
    },
  });

  const handleTest = () => {
    try {
      const payload = JSON.parse(payloadJson);
      testMutation.mutate(payload);
    } catch (error) {
      toast.error("Ugyldig JSON i payload");
    }
  };

  const handleCopyResponse = () => {
    if (testResult) {
      navigator.clipboard.writeText(JSON.stringify(testResult, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Response kopiert til utklippstavle");
    }
  };

  const handleReset = () => {
    setTestResult(null);
    setPayloadJson(
      action.input_schema 
        ? JSON.stringify(generateExamplePayload(action.input_schema), null, 2)
        : "{}"
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Test MCP Action
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {action.fq_action} (v{action.version})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!action.enabled && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Denne action er deaktivert. Aktiver den før testing.
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="payload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="payload">Payload Editor</TabsTrigger>
              <TabsTrigger value="result" disabled={!testResult}>
                Test Result
              </TabsTrigger>
            </TabsList>

            <TabsContent value="payload" className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Request Payload (JSON)</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPayloadJson(
                        action.input_schema 
                          ? JSON.stringify(generateExamplePayload(action.input_schema), null, 2)
                          : "{}"
                      );
                    }}
                  >
                    Reset til eksempel
                  </Button>
                </div>
                <Textarea
                  value={payloadJson}
                  onChange={(e) => setPayloadJson(e.target.value)}
                  rows={12}
                  className="font-mono text-sm"
                  placeholder='{"key": "value"}'
                />
                {action.input_schema && (
                  <p className="text-xs text-muted-foreground">
                    Følg input schema definert for denne action
                  </p>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={testMutation.isPending}
                >
                  Reset
                </Button>
                <Button
                  onClick={handleTest}
                  disabled={testMutation.isPending || !action.enabled}
                >
                  {testMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Kjører test...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Kjør test
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="result" className="space-y-4">
              {testResult && (
                <div className="space-y-4">
                  {/* Status Header */}
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                    <div className="flex items-center gap-3">
                      {testResult.success ? (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-600" />
                      )}
                      <div>
                        <h4 className="font-semibold">
                          {testResult.success ? "Test vellykket" : "Test feilet"}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {new Date(testResult.timestamp).toLocaleString('nb-NO')}
                        </p>
                      </div>
                    </div>
                    {testResult.duration_ms !== undefined && (
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {testResult.duration_ms}ms
                      </Badge>
                    )}
                  </div>

                  <Separator />

                  {/* Response Data */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <FileJson className="h-4 w-4" />
                        {testResult.success ? "Response Data" : "Error Message"}
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyResponse}
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Kopiert
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Kopier
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="rounded-lg bg-muted p-4 max-h-96 overflow-auto">
                      <pre className="text-xs">
                        {testResult.success
                          ? JSON.stringify(testResult.data, null, 2)
                          : testResult.error}
                      </pre>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={testResult.success ? "default" : "destructive"}>
                        {testResult.success ? "SUCCESS" : "ERROR"}
                      </Badge>
                    </div>
                    {testResult.duration_ms !== undefined && (
                      <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="font-mono">{testResult.duration_ms}ms</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                      <span className="text-muted-foreground">Timestamp:</span>
                      <span className="font-mono text-xs">
                        {new Date(testResult.timestamp).toISOString()}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleReset}
                  >
                    Kjør ny test
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to generate example payload from schema
function generateExamplePayload(schema: any): any {
  if (!schema || !schema.properties) {
    return {};
  }

  const example: any = {};
  
  for (const [key, propValue] of Object.entries(schema.properties as any)) {
    const prop = propValue as any;
    if (prop.example !== undefined) {
      example[key] = prop.example;
    } else if (prop.type === 'string') {
      example[key] = prop.enum ? prop.enum[0] : `example_${key}`;
    } else if (prop.type === 'number' || prop.type === 'integer') {
      example[key] = 0;
    } else if (prop.type === 'boolean') {
      example[key] = false;
    } else if (prop.type === 'array') {
      example[key] = [];
    } else if (prop.type === 'object') {
      example[key] = {};
    } else {
      example[key] = null;
    }
  }

  return example;
}
