/**
 * MCP Integration Runs Viewer
 * View integration run logs and webhook callbacks
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export function McpIntegrationRunsView() {
  const { data: runs, isLoading } = useQuery({
    queryKey: ["integration-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_run")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary"> = {
      succeeded: "default",
      failed: "destructive",
      started: "secondary",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  return (
    <>
      <CardHeader>
        <CardTitle>Integration Runs</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : !runs || runs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No integration runs found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>HTTP</TableHead>
                <TableHead>Request ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run: any) => (
                <TableRow key={run.id}>
                  <TableCell className="font-mono text-xs">
                    {format(new Date(run.started_at), "HH:mm:ss")}
                  </TableCell>
                  <TableCell>{run.provider}</TableCell>
                  <TableCell className="font-mono text-xs">{run.workflow_key}</TableCell>
                  <TableCell>{getStatusBadge(run.status)}</TableCell>
                  <TableCell>{run.http_status || "-"}</TableCell>
                  <TableCell className="font-mono text-xs">{run.request_id?.slice(0, 8)}...</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </>
  );
}
