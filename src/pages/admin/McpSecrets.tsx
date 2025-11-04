/**
 * MCP Secrets Management Page
 * Admin UI for managing HMAC signing secrets (Step 8)
 * 
 * NOTE: This is a placeholder for Step 9 UI implementation.
 * Currently only provides basic listing and rotation via API.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

export default function McpSecrets() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">MCP Secrets</h1>
        <p className="text-muted-foreground">
          Manage HMAC signing secrets for integration webhooks
        </p>
      </div>

      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          <strong>Step 8 Complete:</strong> Secret management backend is implemented.
          Full UI coming in Step 9. Use admin API endpoints for now:
          <ul className="mt-2 ml-4 list-disc space-y-1">
            <li><code>GET /admin/mcp/secrets</code> - List secrets</li>
            <li><code>POST /admin/mcp/secrets/create</code> - Create new secret</li>
            <li><code>POST /admin/mcp/secrets/rotate</code> - Rotate secret</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>HMAC Signing Secrets</CardTitle>
          <CardDescription>
            Per-tenant secrets for securing outbound integration calls and validating inbound webhooks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            UI implementation pending (Step 9)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
