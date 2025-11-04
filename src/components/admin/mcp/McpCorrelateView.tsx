/**
 * MCP Correlate View
 * Correlate actions and integration runs by request_id
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function McpCorrelateView() {
  const [requestId, setRequestId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["mcp-correlate", searchTerm],
    queryFn: async () => {
      if (!searchTerm) return null;

      const [actionResult, integrationResult] = await Promise.all([
        supabase.from("mcp_action_log").select("*").eq("request_id", searchTerm).maybeSingle(),
        supabase.from("integration_run").select("*").eq("request_id", searchTerm).maybeSingle(),
      ]);

      return {
        action: actionResult.data,
        integration: integrationResult.data,
      };
    },
    enabled: !!searchTerm,
  });

  const handleSearch = () => {
    setSearchTerm(requestId);
  };

  return (
    <>
      <CardHeader>
        <CardTitle>Correlate by Request ID</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter request ID..."
            value={requestId}
            onChange={(e) => setRequestId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch}>
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>

        {isLoading && <div className="text-center py-8 text-muted-foreground">Searching...</div>}

        {data && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 border rounded">
              <h3 className="font-semibold mb-2">Action Log</h3>
              {data.action ? (
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                  {JSON.stringify(data.action, null, 2)}
                </pre>
              ) : (
                <Alert>
                  <AlertDescription>No action found</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="p-4 border rounded">
              <h3 className="font-semibold mb-2">Integration Run</h3>
              {data.integration ? (
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                  {JSON.stringify(data.integration, null, 2)}
                </pre>
              ) : (
                <Alert>
                  <AlertDescription>No integration run found</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </>
  );
}
