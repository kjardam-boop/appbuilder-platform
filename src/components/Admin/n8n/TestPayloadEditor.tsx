/**
 * TestPayloadEditor - Auto-saving test payload editor for n8n workflows
 * Uses useAutoSave hook for proper debouncing and status indication
 */

import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAutoSave, AutoSaveStatus } from '@/hooks/useAutoSave';
import { updateTestPayload } from '@/modules/core/mcp/services/tenantWorkflowService';
import { toast } from 'sonner';
import { Save, Loader2, CheckCircle2, AlertCircle, FileJson, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TestPayloadEditorProps {
  workflowId: string;
  workflowKey: string;
  tenantId: string;
  initialPayload: Record<string, unknown> | null;
  templates?: Array<{ key: string; name: string; example_output?: any; input_schema?: any }>;
  onPayloadGenerate?: (workflowKey: string) => string | null;
  disabled?: boolean;
}

// Status icon component
function StatusIcon({ status }: { status: AutoSaveStatus }) {
  switch (status) {
    case 'pending':
      return <span className="text-yellow-500 text-xs">Venter...</span>;
    case 'saving':
      return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />;
    case 'saved':
      return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    case 'error':
      return <AlertCircle className="h-3 w-3 text-red-500" />;
    default:
      return null;
  }
}

export function TestPayloadEditor({
  workflowId,
  workflowKey,
  tenantId,
  initialPayload,
  templates,
  onPayloadGenerate,
  disabled = false,
}: TestPayloadEditorProps) {
  // Local state for the textarea value
  const [value, setValue] = useState<string>(() => 
    initialPayload && Object.keys(initialPayload).length > 0 
      ? JSON.stringify(initialPayload, null, 2) 
      : ''
  );
  
  // Track if content has been modified from initial
  const [isModified, setIsModified] = useState(false);

  // Initialize from props when they change
  useEffect(() => {
    if (initialPayload && Object.keys(initialPayload).length > 0) {
      const formatted = JSON.stringify(initialPayload, null, 2);
      setValue(formatted);
    }
  }, [initialPayload]);

  // Auto-save hook
  const { status, trigger, error } = useAutoSave({
    onSave: async () => {
      if (!value.trim()) return;
      
      try {
        const parsed = JSON.parse(value);
        await updateTestPayload(workflowId, tenantId, parsed);
      } catch (e) {
        throw new Error('Ugyldig JSON format');
      }
    },
    delay: 1500,
    enabled: !!tenantId && !!workflowId && isModified,
  });

  // Handle text change
  const handleChange = (newValue: string) => {
    setValue(newValue);
    setIsModified(true);
    
    // Validate JSON and trigger save if valid
    try {
      JSON.parse(newValue);
      trigger(newValue);
    } catch {
      // Invalid JSON - don't trigger save yet, but update local state
    }
  };

  // Apply template
  const applyTemplate = (templatePayload: string) => {
    setValue(templatePayload);
    setIsModified(true);
    trigger(templatePayload);
    toast.success('Mal lagt til');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={`payload-${workflowKey}`} className="text-xs">
          Test Payload (JSON)
        </Label>
        <div className="flex items-center gap-2">
          {/* Template dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" disabled={disabled}>
                <FileJson className="h-3 w-3" />
                Bruk mal
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Generate for this workflow */}
              <DropdownMenuItem
                onClick={() => {
                  const suggestion = onPayloadGenerate?.(workflowKey);
                  if (suggestion) {
                    applyTemplate(suggestion);
                  } else {
                    toast.info('Ingen mal funnet for denne workflowen');
                  }
                }}
              >
                Generer for denne workflow
              </DropdownMenuItem>
              
              {/* Templates from database */}
              {templates && templates.length > 0 && (
                <>
                  <div className="px-2 py-1 text-xs text-muted-foreground border-t mt-1 pt-1">
                    Fra workflow templates:
                  </div>
                  {templates.map((template) => (
                    <DropdownMenuItem
                      key={template.key}
                      onClick={() => {
                        const suggestion = onPayloadGenerate?.(template.key);
                        if (suggestion) {
                          applyTemplate(suggestion);
                        }
                      }}
                    >
                      {template.name}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status indicator */}
          <div className="flex items-center gap-1 min-w-[80px] justify-end">
            <StatusIcon status={status} />
            {status === 'saved' && (
              <span className="text-xs text-green-600">Lagret</span>
            )}
            {status === 'error' && (
              <span className="text-xs text-red-600">Feil</span>
            )}
          </div>
        </div>
      </div>

      <Textarea
        id={`payload-${workflowKey}`}
        placeholder='{"companies": [{"id": "uuid", "name": "Firma AS"}]}'
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="font-mono text-xs h-24"
        disabled={disabled}
      />

      {error && (
        <p className="text-xs text-red-500">{error.message}</p>
      )}

      <p className="text-xs text-muted-foreground">
        Test payload lagres automatisk etter 1.5 sekunder. Velg "Bruk mal" for forslag.
      </p>
    </div>
  );
}


