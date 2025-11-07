import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code2, FileJson, CheckCircle, XCircle, Calendar, User } from "lucide-react";

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

interface McpActionDetailsDialogProps {
  action: McpRegistryEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function McpActionDetailsDialog({
  action,
  open,
  onOpenChange,
}: McpActionDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="flex items-center gap-2">
                <Code2 className="h-5 w-5" />
                {action.action_key}
              </DialogTitle>
              <DialogDescription className="font-mono text-xs">
                {action.fq_action}
              </DialogDescription>
            </div>
            {action.enabled ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Aktivert
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <XCircle className="h-3 w-3" />
                Deaktivert
              </Badge>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              {action.description && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Beskrivelse</h4>
                  <p className="text-sm text-muted-foreground">
                    {action.description}
                  </p>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-medium mb-2">App</h4>
                  <Badge variant="outline">{action.app_key}</Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Version</h4>
                  <span className="text-sm font-mono">{action.version}</span>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Opprettet:</span>
                  <span>{new Date(action.created_at).toLocaleDateString('nb-NO')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Av:</span>
                  <span className="font-mono text-xs">{action.created_by}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Schemas */}
            <Tabs defaultValue="input" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="input" className="gap-2">
                  <FileJson className="h-4 w-4" />
                  Input Schema
                </TabsTrigger>
                <TabsTrigger value="output" className="gap-2">
                  <FileJson className="h-4 w-4" />
                  Output Schema
                </TabsTrigger>
              </TabsList>

              <TabsContent value="input" className="space-y-4">
                {action.input_schema ? (
                  <div className="rounded-lg bg-muted p-4">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(action.input_schema, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileJson className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Ingen input schema definert</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="output" className="space-y-4">
                {action.output_schema ? (
                  <div className="rounded-lg bg-muted p-4">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(action.output_schema, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileJson className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Ingen output schema definert</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Usage Example */}
            <div>
              <h4 className="text-sm font-medium mb-2">Bruk</h4>
              <div className="rounded-lg bg-muted p-4">
                <pre className="text-xs overflow-x-auto">
                  {`// Call action via MCP provider
await mcpExecute({
  action: "${action.fq_action}",
  version: "${action.version}",
  payload: {
    // Your input payload here
  }
});`}
                </pre>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
