/**
 * AI MCP Demo Page
 * Demonstrates AI agent with MCP tool access
 */

import { AIMcpChatInterface } from '@/components/AI/AIMcpChatInterface';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTenantContext } from '@/hooks/useTenantContext';
import { AVAILABLE_MCP_TOOLS } from '@/modules/core/ai';
import { Wrench, Database, Cpu } from 'lucide-react';
import { AppBreadcrumbs } from '@/components/ui/app-breadcrumbs';
import { generateAdminBreadcrumbs } from '@/helpers/breadcrumbHelper';

export default function AIMcpDemo() {
  const context = useTenantContext();
  const tenantId = context?.tenant_id || '';

  if (!tenantId) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              Vennligst velg en tenant først
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const systemPrompt = `Du er en intelligent AI-assistent for bedriften.

Du har tilgang til følgende verktøy:
- list_companies: Se selskaper i databasen
- list_projects: Se prosjekter for denne tenanten
- list_tasks: Se oppgaver for denne tenanten
- list_applications: Se tilgjengelige applikasjoner (ERP, CRM, etc)
- create_project: Opprett nye prosjekter
- create_task: Opprett nye oppgaver
- search_companies: Søk etter selskaper

Eksempler på hva du kan hjelpe med:
- "Vis meg alle prosjekter"
- "Opprett et nytt prosjekt for ERP-evaluering"
- "Søk etter selskaper i Norge"
- "Hvilke ERP-systemer finnes i katalogen?"
- "Opprett en oppgave i prosjekt X"

Vær presis, bruk verktøyene aktivt, og forklar hva du gjør.`;

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">AI MCP Demo</h1>
        <p className="text-muted-foreground">
          Test AI-assistenten med tilgang til plattformens MCP-infrastruktur
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Cards */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" />
                Tilgjengelige Resources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Badge variant="outline">GET</Badge>
                  <span>companies</span>
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline">GET</Badge>
                  <span>projects</span>
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline">GET</Badge>
                  <span>tasks</span>
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline">GET</Badge>
                  <span>applications</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                MCP Tools ({AVAILABLE_MCP_TOOLS.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {AVAILABLE_MCP_TOOLS.map((tool) => (
                  <div key={tool.name} className="text-sm">
                    <div className="font-medium">{tool.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {tool.description}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                Capabilities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>✓ Strukturert tilgang til data</li>
                <li>✓ Tenant-isolasjon</li>
                <li>✓ RBAC/policies</li>
                <li>✓ Tool calling (OpenAI format)</li>
                <li>✓ Multi-turn conversations</li>
                <li>✓ Audit logging</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <AIMcpChatInterface
            tenantId={tenantId}
            systemPrompt={systemPrompt}
            placeholder="Prøv: 'Vis meg alle prosjekter' eller 'Opprett et nytt prosjekt'"
            title="AI MCP Assistent"
            description="Med tilgang til companies, projects, tasks og applications"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Eksempel-prompts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Resources</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• "Vis meg alle selskaper"</li>
                <li>• "Søk etter selskaper i Norge"</li>
                <li>• "Liste alle prosjekter"</li>
                <li>• "Vis oppgaver med høy prioritet"</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Actions</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• "Opprett et nytt prosjekt for ERP-evaluering"</li>
                <li>• "Lag en oppgave: Analyser leverandører"</li>
                <li>• "Hvilke ERP-systemer finnes?"</li>
                <li>• "Finn informasjon om selskap X"</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
