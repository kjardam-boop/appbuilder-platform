/**
 * WorkflowTemplatePicker
 * 
 * A component for selecting and comparing workflow templates.
 * Shows available templates and a diff view comparing current workflow with selected template.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileJson,
  Plus,
  Minus,
  Equal,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

interface WorkflowTemplate {
  id: string;
  key: string;
  name: string;
  description: string;
  version: string;
  changelog: string | null;
  workflow_json: any;
  category: string;
}

interface N8nNode {
  id: string;
  name: string;
  type: string;
}

interface NodeDiff {
  name: string;
  type: string;
  status: 'added' | 'removed' | 'unchanged' | 'modified';
}

interface WorkflowTemplatePickerProps {
  workflowKey: string;
  currentWorkflowJson: any | null;
  onApplyTemplate: (templateJson: any) => void;
  isApplying?: boolean;
}

// Extract nodes from workflow JSON
function getNodes(workflowJson: any): N8nNode[] {
  if (!workflowJson?.nodes) return [];
  return workflowJson.nodes.map((n: any) => ({
    id: n.id || n.name,
    name: n.name,
    type: n.type,
  }));
}

// Compare two workflow JSONs and return node diffs
function compareWorkflows(current: any | null, template: any | null): NodeDiff[] {
  const currentNodes = getNodes(current);
  const templateNodes = getNodes(template);
  
  const diffs: NodeDiff[] = [];
  const currentNodeNames = new Set(currentNodes.map(n => n.name));
  const templateNodeNames = new Set(templateNodes.map(n => n.name));
  
  // Find added nodes (in template but not in current)
  for (const node of templateNodes) {
    if (!currentNodeNames.has(node.name)) {
      diffs.push({ name: node.name, type: node.type, status: 'added' });
    }
  }
  
  // Find unchanged/modified nodes
  for (const node of currentNodes) {
    if (templateNodeNames.has(node.name)) {
      // Node exists in both - check if modified
      const templateNode = templateNodes.find(n => n.name === node.name);
      if (templateNode && templateNode.type !== node.type) {
        diffs.push({ name: node.name, type: `${node.type} → ${templateNode.type}`, status: 'modified' });
      } else {
        diffs.push({ name: node.name, type: node.type, status: 'unchanged' });
      }
    } else {
      // Node only in current (will be removed)
      diffs.push({ name: node.name, type: node.type, status: 'removed' });
    }
  }
  
  // Sort: added first, then modified, then unchanged, then removed
  const statusOrder = { added: 0, modified: 1, unchanged: 2, removed: 3 };
  diffs.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  
  return diffs;
}

export function WorkflowTemplatePicker({
  workflowKey,
  currentWorkflowJson,
  onApplyTemplate,
  isApplying = false,
}: WorkflowTemplatePickerProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  // Fetch available templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['workflow-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('id, key, name, description, version, changelog, workflow_json, category')
        .eq('is_active', true)
        .order('name');
      
      if (error) {
        console.error('Failed to fetch templates:', error);
        return [];
      }
      return (data || []) as WorkflowTemplate[];
    },
  });

  // Get related templates (same base key or category)
  const relatedTemplates = (templates || []).filter(t => {
    const baseKey = workflowKey.replace(/-v\d+$/, '').replace(/-board$/, '');
    return t.key.includes(baseKey) || t.category === 'workshop';
  });

  const selectedTemplate = selectedTemplateId 
    ? templates?.find(t => t.id === selectedTemplateId) 
    : null;

  const nodeDiffs = selectedTemplate 
    ? compareWorkflows(currentWorkflowJson, selectedTemplate.workflow_json)
    : [];

  const addedCount = nodeDiffs.filter(d => d.status === 'added').length;
  const removedCount = nodeDiffs.filter(d => d.status === 'removed').length;
  const modifiedCount = nodeDiffs.filter(d => d.status === 'modified').length;

  const handleApply = () => {
    if (selectedTemplate?.workflow_json) {
      onApplyTemplate(selectedTemplate.workflow_json);
      setShowDiff(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">Laster maler...</span>
      </div>
    );
  }

  if (!relatedTemplates.length) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        <AlertCircle className="h-4 w-4 mx-auto mb-2" />
        Ingen tilgjengelige maler
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Template Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Velg mal</label>
        <Select
          value={selectedTemplateId || ""}
          onValueChange={(value) => {
            setSelectedTemplateId(value || null);
            if (value) setShowDiff(true);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Velg en workflow-mal..." />
          </SelectTrigger>
          <SelectContent>
            {relatedTemplates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex items-center gap-2">
                  <FileJson className="h-4 w-4" />
                  <span>{template.name}</span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    v{template.version}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selected Template Info */}
      {selectedTemplate && (
        <div className="p-3 bg-muted rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{selectedTemplate.name}</p>
              <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
            </div>
            <Badge variant="outline">v{selectedTemplate.version}</Badge>
          </div>
          
          {selectedTemplate.changelog && (
            <p className="text-xs text-muted-foreground border-t pt-2">
              {selectedTemplate.changelog}
            </p>
          )}

          {/* Quick diff summary */}
          <div className="flex gap-2 pt-2">
            {addedCount > 0 && (
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <Plus className="h-3 w-3 mr-1" />
                {addedCount} nye
              </Badge>
            )}
            {modifiedCount > 0 && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                <RefreshCw className="h-3 w-3 mr-1" />
                {modifiedCount} endret
              </Badge>
            )}
            {removedCount > 0 && (
              <Badge className="bg-red-100 text-red-700 border-red-200">
                <Minus className="h-3 w-3 mr-1" />
                {removedCount} fjernet
              </Badge>
            )}
            {addedCount === 0 && modifiedCount === 0 && removedCount === 0 && (
              <Badge className="bg-gray-100 text-gray-700">
                <Equal className="h-3 w-3 mr-1" />
                Ingen endringer
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDiff(true)}
            >
              Vis endringer
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              disabled={isApplying || (addedCount === 0 && modifiedCount === 0 && removedCount === 0)}
            >
              {isApplying ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Bruk mal
            </Button>
          </div>
        </div>
      )}

      {/* Diff Dialog */}
      <Dialog open={showDiff} onOpenChange={setShowDiff}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Sammenlign workflow</DialogTitle>
            <DialogDescription>
              {currentWorkflowJson 
                ? 'Nåværende workflow vs. valgt mal'
                : 'Valgt mal inneholder følgende noder'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-4 py-2 border-b">
            <div className="flex-1 text-center">
              <p className="font-medium text-sm">Nåværende</p>
              <p className="text-xs text-muted-foreground">
                {getNodes(currentWorkflowJson).length} noder
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 text-center">
              <p className="font-medium text-sm">{selectedTemplate?.name}</p>
              <p className="text-xs text-muted-foreground">
                {getNodes(selectedTemplate?.workflow_json).length} noder
              </p>
            </div>
          </div>

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-1">
              {nodeDiffs.map((diff, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-2 rounded ${
                    diff.status === 'added' 
                      ? 'bg-green-50 border-l-4 border-green-500' 
                      : diff.status === 'removed'
                      ? 'bg-red-50 border-l-4 border-red-500'
                      : diff.status === 'modified'
                      ? 'bg-amber-50 border-l-4 border-amber-500'
                      : 'bg-gray-50 border-l-4 border-gray-200'
                  }`}
                >
                  {diff.status === 'added' && <Plus className="h-4 w-4 text-green-600" />}
                  {diff.status === 'removed' && <Minus className="h-4 w-4 text-red-600" />}
                  {diff.status === 'modified' && <RefreshCw className="h-4 w-4 text-amber-600" />}
                  {diff.status === 'unchanged' && <CheckCircle2 className="h-4 w-4 text-gray-400" />}
                  
                  <div className="flex-1">
                    <p className={`font-medium text-sm ${
                      diff.status === 'added' ? 'text-green-700' :
                      diff.status === 'removed' ? 'text-red-700' :
                      diff.status === 'modified' ? 'text-amber-700' :
                      'text-gray-600'
                    }`}>
                      {diff.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {diff.type.replace('n8n-nodes-base.', '')}
                    </p>
                  </div>
                  
                  <Badge variant="outline" className={`text-xs ${
                    diff.status === 'added' ? 'bg-green-100 text-green-700' :
                    diff.status === 'removed' ? 'bg-red-100 text-red-700' :
                    diff.status === 'modified' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {diff.status === 'added' && 'Ny'}
                    {diff.status === 'removed' && 'Fjernes'}
                    {diff.status === 'modified' && 'Endret'}
                    {diff.status === 'unchanged' && 'Uendret'}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDiff(false)}>
              Avbryt
            </Button>
            <Button 
              onClick={handleApply}
              disabled={isApplying}
            >
              {isApplying ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Bruk mal og oppdater i n8n
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

