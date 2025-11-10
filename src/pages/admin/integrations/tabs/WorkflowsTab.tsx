import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Workflow, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function WorkflowsTab() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Workflows</h2>
        <p className="text-muted-foreground">
          MCP workflows og automatiseringer
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            MCP Workflows
          </CardTitle>
          <CardDescription>
            Administrer MCP-baserte workflows og integrasjoner
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Denne seksjonen vil inneholde MCP workflows når de er migrert til den nye integrasjonsmodellen.
            </p>
            <Button onClick={() => navigate("/admin/mcp/workflows")} variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Gå til MCP Workflows (gammel side)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
