import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ObservabilityTab() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Observability</h2>
        <p className="text-muted-foreground">
          Logs, health checks og recommendations
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              MCP Observability
            </CardTitle>
            <CardDescription>
              Logs og metrics for MCP-integrasjoner
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/admin/mcp/observability")} variant="outline" className="w-full">
              <ExternalLink className="h-4 w-4 mr-2" />
              Åpne MCP Observability
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recommendations
            </CardTitle>
            <CardDescription>
              AI-baserte integrasjonsanbefalinger
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/admin/integration-recommendations")} variant="outline" className="w-full">
              <ExternalLink className="h-4 w-4 mr-2" />
              Åpne Recommendations
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Integration Graph
            </CardTitle>
            <CardDescription>
              Visualiser integrasjonsnettverk
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/admin/integration-graph")} variant="outline" className="w-full">
              <ExternalLink className="h-4 w-4 mr-2" />
              Åpne Graph
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integration Action Logs</CardTitle>
          <CardDescription>
            Generaliserte logger for alle integrasjonstyper (tidligere mcp_action_log)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-8">
            Logger vil vises her når ny logging-funksjonalitet er implementert
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
