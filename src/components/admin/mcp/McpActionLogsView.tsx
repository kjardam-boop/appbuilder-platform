/**
 * MCP Action Logs Viewer
 * Filter, view, and export MCP action execution logs
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Search, Download, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ActionLog {
  id: string;
  tenant_id: string;
  user_id: string | null;
  action_name: string;
  payload_json: any;
  result_json: any;
  status: string;
  error_message: string | null;
  error_code: string | null;
  duration_ms: number | null;
  idempotency_key: string | null;
  request_id: string | null;
  registry_fq_action: string | null;
  policy_result: any;
  resource_type: string | null;
  resource_id: string | null;
  http_method: string | null;
  user_agent: string | null;
  integration_run_id: string | null;
  created_at: string;
}

export function McpActionLogsView() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<ActionLog | null>(null);

  const { data: logs, isLoading } = useQuery({
    queryKey: ["mcp-action-logs", search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("mcp_action_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (search) {
        query = query.or(`action_name.ilike.%${search}%,error_code.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ActionLog[];
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary"> = {
      success: "default",
      error: "destructive",
      in_progress: "secondary",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  return (
    <>
      <CardHeader>
        <CardTitle>Action Logs</CardTitle>
        <div className="flex gap-4 mt-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search actions, errors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : !logs || logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No logs found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Request ID</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-mono text-xs">
                    {format(new Date(log.created_at), "HH:mm:ss")}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{log.action_name}</div>
                    {log.registry_fq_action && (
                      <div className="text-xs text-muted-foreground">{log.registry_fq_action}</div>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(log.status)}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.duration_ms ? `${log.duration_ms}ms` : "-"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.request_id?.slice(0, 8)}...</TableCell>
                  <TableCell>
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                        <SheetHeader>
                          <SheetTitle>{log.action_name}</SheetTitle>
                          <SheetDescription>
                            {format(new Date(log.created_at), "PPpp")}
                          </SheetDescription>
                        </SheetHeader>
                        <div className="space-y-4 mt-6">
                          <div>
                            <h3 className="font-semibold mb-2">Request ID</h3>
                            <div className="flex gap-2">
                              <code className="flex-1 p-2 bg-muted rounded text-xs">{log.request_id}</code>
                              <Button size="sm" variant="outline" onClick={() => copyToClipboard(log.request_id || "")}>
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {log.error_message && (
                            <div>
                              <h3 className="font-semibold mb-2">Error</h3>
                              <div className="p-3 bg-destructive/10 rounded">
                                <div className="font-mono text-sm text-destructive">{log.error_code}</div>
                                <div className="text-sm mt-1">{log.error_message}</div>
                              </div>
                            </div>
                          )}
                          <div>
                            <h3 className="font-semibold mb-2">Payload</h3>
                            <pre className="p-3 bg-muted rounded text-xs overflow-x-auto">
                              {JSON.stringify(log.payload_json, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <h3 className="font-semibold mb-2">Result</h3>
                            <pre className="p-3 bg-muted rounded text-xs overflow-x-auto">
                              {JSON.stringify(log.result_json, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </SheetContent>
                    </Sheet>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </>
  );
}
