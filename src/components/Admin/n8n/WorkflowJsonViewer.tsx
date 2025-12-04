/**
 * WorkflowJsonViewer - Visual display of n8n workflow JSON
 * Shows workflow steps in a user-friendly collapsible format
 * Focus on trigger/payload data that's most relevant for testing
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown, 
  ChevronRight, 
  Webhook, 
  Code, 
  Database, 
  Bot,
  ArrowRight,
  Copy,
  Check
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion?: number;
  position?: [number, number];
  parameters?: Record<string, any>;
  credentials?: Record<string, any>;
}

interface N8nWorkflowJson {
  name: string;
  nodes?: N8nNode[];
  connections?: Record<string, any>;
  settings?: Record<string, any>;
  active?: boolean;
}

interface WorkflowJsonViewerProps {
  workflowJson: N8nWorkflowJson | null;
  className?: string;
}

// Get icon for node type
function getNodeIcon(type: string) {
  if (type.includes('webhook')) return <Webhook className="h-4 w-4" />;
  if (type.includes('code') || type.includes('function')) return <Code className="h-4 w-4" />;
  if (type.includes('supabase') || type.includes('postgres') || type.includes('mysql')) return <Database className="h-4 w-4" />;
  if (type.includes('openai') || type.includes('anthropic') || type.includes('ai')) return <Bot className="h-4 w-4" />;
  return <ArrowRight className="h-4 w-4" />;
}

// Get friendly name for node type
function getNodeTypeName(type: string): string {
  const typeMap: Record<string, string> = {
    'n8n-nodes-base.webhook': 'Webhook Trigger',
    'n8n-nodes-base.code': 'Code/JavaScript',
    'n8n-nodes-base.function': 'Function',
    'n8n-nodes-base.supabase': 'Supabase',
    'n8n-nodes-base.notion': 'Notion',
    'n8n-nodes-base.odoo': 'Odoo',
    'n8n-nodes-base.if': 'IF Condition',
    'n8n-nodes-base.respondToWebhook': 'Respond to Webhook',
    'n8n-nodes-base.httpRequest': 'HTTP Request',
  };
  return typeMap[type] || type.replace('n8n-nodes-base.', '');
}

// Extract webhook path from node
function extractWebhookPath(node: N8nNode): string | null {
  if (node.type === 'n8n-nodes-base.webhook' && node.parameters?.path) {
    return `/webhook/${node.parameters.path}`;
  }
  return null;
}

// Node display component
function NodeDisplay({ node, index, isFirst }: { node: N8nNode; index: number; isFirst: boolean }) {
  const [isOpen, setIsOpen] = useState(isFirst); // Auto-open first node (trigger)
  const [copied, setCopied] = useState(false);
  
  const webhookPath = extractWebhookPath(node);
  const isWebhook = node.type.includes('webhook');
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className={`
          flex items-center gap-3 p-3 rounded-lg border transition-colors
          ${isOpen ? 'bg-muted/50 border-primary/20' : 'hover:bg-muted/30'}
          ${isFirst ? 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/20' : ''}
        `}>
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium">
            {index + 1}
          </div>
          {getNodeIcon(node.type)}
          <div className="flex-1 text-left">
            <div className="font-medium text-sm">{node.name}</div>
            <div className="text-xs text-muted-foreground">{getNodeTypeName(node.type)}</div>
          </div>
          {isWebhook && webhookPath && (
            <Badge variant="outline" className="text-xs font-mono">
              {webhookPath}
            </Badge>
          )}
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="ml-9 mt-2 p-3 bg-muted/30 rounded-lg border-l-2 border-primary/20">
          {/* Webhook specific info */}
          {isWebhook && (
            <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200">
              <div className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
                Trigger Endpoint
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono flex-1 text-amber-800 dark:text-amber-300">
                  POST {webhookPath}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(webhookPath || '');
                  }}
                >
                  {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          )}
          
          {/* Parameters */}
          {node.parameters && Object.keys(node.parameters).length > 0 && (
            <div>
              <div className="text-xs font-medium mb-1 text-muted-foreground">Parameters</div>
              <pre className="text-xs font-mono bg-background p-2 rounded border overflow-x-auto max-h-40">
                {JSON.stringify(node.parameters, null, 2)}
              </pre>
            </div>
          )}
          
          {/* Credentials (masked) */}
          {node.credentials && Object.keys(node.credentials).length > 0 && (
            <div className="mt-2">
              <div className="text-xs font-medium mb-1 text-muted-foreground">Credentials</div>
              <div className="text-xs text-muted-foreground">
                {Object.keys(node.credentials).map(key => (
                  <Badge key={key} variant="secondary" className="mr-1">
                    {key}: ***
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function WorkflowJsonViewer({ workflowJson, className }: WorkflowJsonViewerProps) {
  const [showFullJson, setShowFullJson] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!workflowJson) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-muted-foreground">
          Ingen workflow JSON tilgjengelig
        </CardContent>
      </Card>
    );
  }

  const nodes = workflowJson.nodes || [];
  
  const copyFullJson = () => {
    navigator.clipboard.writeText(JSON.stringify(workflowJson, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{workflowJson.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={workflowJson.active ? 'default' : 'secondary'}>
                {workflowJson.active ? 'Active' : 'Inactive'}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {nodes.length} steg
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={copyFullJson}
          >
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            Kopier JSON
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2">
        {/* Node list */}
        {nodes.map((node, index) => (
          <NodeDisplay 
            key={node.id || index} 
            node={node} 
            index={index}
            isFirst={index === 0}
          />
        ))}
        
        {/* Full JSON toggle */}
        <Collapsible open={showFullJson} onOpenChange={setShowFullJson}>
          <CollapsibleTrigger className="w-full mt-4">
            <div className="flex items-center justify-center gap-2 p-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
              {showFullJson ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {showFullJson ? 'Skjul' : 'Vis'} full JSON
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <pre className="mt-2 p-3 bg-muted rounded-lg text-xs font-mono overflow-x-auto max-h-96">
              {JSON.stringify(workflowJson, null, 2)}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}


