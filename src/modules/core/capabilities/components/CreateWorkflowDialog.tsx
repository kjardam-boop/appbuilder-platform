/**
 * CreateWorkflowDialog
 * 
 * Dialog component for creating new n8n workflows from the platform.
 * Part of the workflow-builder capability.
 * 
 * Features:
 * - Template selection (generic-webhook, ocr-to-sheets, etc.)
 * - Custom workflow name and description
 * - Shows source capability context
 * - Pushes to n8n and returns webhook URL
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Loader2, 
  Webhook, 
  FileSpreadsheet, 
  Receipt, 
  Shuffle,
  CheckCircle2,
  AlertCircle,
  Copy,
} from "lucide-react";
import { 
  WorkflowCreatorService, 
  WorkflowTemplateId,
  type WorkflowBuilderResult 
} from "../services/workflowCreatorService";
import { useToast } from "@/hooks/use-toast";

// ============================================================================
// Types
// ============================================================================

interface CreateWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  sourceCapability?: {
    key: string;
    name: string;
    outputFormat?: string;
  };
  onWorkflowCreated?: (result: WorkflowBuilderResult) => void;
}

interface TemplateOption {
  id: WorkflowTemplateId;
  name: string;
  description: string;
  icon: React.ReactNode;
}

// ============================================================================
// Constants
// ============================================================================

const TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    id: 'generic-webhook',
    name: 'Generisk webhook',
    description: 'Aksepterer all JSON-input, perfekt for OCR-data',
    icon: <Webhook className="h-5 w-5" />,
  },
  {
    id: 'ocr-to-sheets',
    name: 'OCR til Google Sheets',
    description: 'Lagrer OCR-resultater i et regneark',
    icon: <FileSpreadsheet className="h-5 w-5" />,
  },
  {
    id: 'invoice-to-erp',
    name: 'Faktura til ERP',
    description: 'Sender fakturadata til ERP-system',
    icon: <Receipt className="h-5 w-5" />,
  },
  {
    id: 'data-transformer',
    name: 'Datatransformering',
    description: 'Fleksibel workflow for egne transformasjoner',
    icon: <Shuffle className="h-5 w-5" />,
  },
];

// ============================================================================
// Component
// ============================================================================

export function CreateWorkflowDialog({
  open,
  onOpenChange,
  tenantId,
  sourceCapability,
  onWorkflowCreated,
}: CreateWorkflowDialogProps) {
  const { toast } = useToast();
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplateId>("generic-webhook");
  
  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<WorkflowBuilderResult | null>(null);

  // Reset form when dialog opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName("");
      setDescription("");
      setSelectedTemplate("generic-webhook");
      setResult(null);
    }
    onOpenChange(newOpen);
  };

  // Create workflow
  const handleCreate = async () => {
    if (!name.trim()) {
      toast({
        title: "Mangler navn",
        description: "Vennligst oppgi et navn for workflowen",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const createResult = await WorkflowCreatorService.createFromTemplate(tenantId, {
        name: name.trim(),
        description: description.trim() || undefined,
        templateId: selectedTemplate,
        context: {
          tenantId,
          sourceCapability: sourceCapability?.key,
        },
      });

      setResult(createResult);

      if (createResult.success) {
        toast({
          title: "Workflow opprettet!",
          description: `${name} er nå tilgjengelig i n8n`,
        });
        onWorkflowCreated?.(createResult);
      } else {
        toast({
          title: "Feil ved oppretting",
          description: createResult.error || "Ukjent feil",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Feil",
        description: err instanceof Error ? err.message : "Ukjent feil",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Copy webhook URL
  const copyWebhookUrl = () => {
    if (result?.webhookUrl) {
      navigator.clipboard.writeText(result.webhookUrl);
      toast({
        title: "Kopiert!",
        description: "Webhook URL er kopiert til utklippstavlen",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Opprett ny n8n workflow</DialogTitle>
          <DialogDescription>
            {sourceCapability ? (
              <>Oppretter en workflow som kan motta data fra <strong>{sourceCapability.name}</strong></>
            ) : (
              "Opprett en ny workflow som kan motta data fra plattformen"
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Success state */}
        {result?.success ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 text-green-600">
              <CheckCircle2 className="h-8 w-8" />
              <div>
                <p className="font-medium">Workflow opprettet!</p>
                <p className="text-sm text-muted-foreground">{name}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <div className="flex gap-2">
                <Input
                  value={result.webhookUrl || ""}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyWebhookUrl}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Bruk denne URL-en for å sende data til workflowen
              </p>
            </div>

            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>
                Ferdig
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            {/* Form */}
            <div className="space-y-4 py-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="workflow-name">Navn *</Label>
                <Input
                  id="workflow-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="F.eks. OCR til Regneark"
                  disabled={isCreating}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="workflow-description">Beskrivelse</Label>
                <Textarea
                  id="workflow-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Hva gjør denne workflowen?"
                  disabled={isCreating}
                  autoResize={true}
                  maxHeight={100}
                />
              </div>

              {/* Template selection */}
              <div className="space-y-2">
                <Label>Velg mal</Label>
                <RadioGroup
                  value={selectedTemplate}
                  onValueChange={(value) => setSelectedTemplate(value as WorkflowTemplateId)}
                  disabled={isCreating}
                >
                  {TEMPLATE_OPTIONS.map((template) => (
                    <div
                      key={template.id}
                      className={`flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                        selectedTemplate === template.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/50"
                      }`}
                      onClick={() => !isCreating && setSelectedTemplate(template.id)}
                    >
                      <RadioGroupItem value={template.id} id={template.id} className="mt-1" />
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-md ${
                          selectedTemplate === template.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}>
                          {template.icon}
                        </div>
                        <div className="flex-1">
                          <label htmlFor={template.id} className="font-medium cursor-pointer">
                            {template.name}
                          </label>
                          <p className="text-sm text-muted-foreground">
                            {template.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Source capability info */}
              {sourceCapability && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="text-muted-foreground">
                    <strong>Input fra:</strong> {sourceCapability.name}
                  </p>
                  {sourceCapability.outputFormat && (
                    <p className="text-muted-foreground mt-1">
                      <strong>Format:</strong>{" "}
                      <code className="text-xs bg-muted px-1 rounded">
                        {sourceCapability.outputFormat}
                      </code>
                    </p>
                  )}
                </div>
              )}

              {/* Error state */}
              {result && !result.success && (
                <div className="flex items-start gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{result.error}</span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isCreating}
              >
                Avbryt
              </Button>
              <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Oppretter...
                  </>
                ) : (
                  "Opprett workflow"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default CreateWorkflowDialog;

