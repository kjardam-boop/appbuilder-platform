/**
 * MCP Integration Runs Viewer
 * View integration run logs and webhook callbacks
 */

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, parseISO } from "date-fns";
import { RefreshCw, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";

interface McpIntegrationRunsViewProps {
  tenantId: string;
}

type SortColumn = 'time' | 'provider' | 'workflow' | 'status' | 'http' | null;
type SortDirection = 'asc' | 'desc';

export function McpIntegrationRunsView({ tenantId }: McpIntegrationRunsViewProps) {
  const [filters, setFilters] = useState({
    time: '',
    provider: '',
    workflow: '',
    status: '',
    http: '',
    requestId: '',
  });
  const [sortColumn, setSortColumn] = useState<SortColumn>('time');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Pagination
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortColumn, sortDirection]);

  const { data: runs, isLoading, refetch } = useQuery({
    queryKey: ["integration-runs", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_run")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("started_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    enabled: !!tenantId,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary"> = {
      succeeded: "default",
      failed: "destructive",
      started: "secondary",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Filter and sort data
  const filteredAndSortedRuns = useMemo(() => {
    if (!runs) return [];

    let filtered = runs.filter((run: any) => {
      const timeStr = format(parseISO(run.started_at), "dd.MM.yyyy HH:mm:ss").toLowerCase();
      const matchesTime = timeStr.includes(filters.time.toLowerCase());
      const matchesProvider = run.provider?.toLowerCase().includes(filters.provider.toLowerCase()) ?? true;
      const matchesWorkflow = run.workflow_key?.toLowerCase().includes(filters.workflow.toLowerCase()) ?? true;
      const matchesStatus = run.status?.toLowerCase().includes(filters.status.toLowerCase()) ?? true;
      const matchesHttp = run.http_status?.toString().includes(filters.http) ?? true;
      const matchesRequestId = run.request_id?.toLowerCase().includes(filters.requestId.toLowerCase()) ?? true;

      return matchesTime && matchesProvider && matchesWorkflow && matchesStatus && matchesHttp && matchesRequestId;
    });

    // Sort
    if (sortColumn) {
      filtered.sort((a: any, b: any) => {
        let aVal, bVal;

        switch (sortColumn) {
          case 'time':
            aVal = new Date(a.started_at).getTime();
            bVal = new Date(b.started_at).getTime();
            break;
          case 'provider':
            aVal = a.provider || '';
            bVal = b.provider || '';
            break;
          case 'workflow':
            aVal = a.workflow_key || '';
            bVal = b.workflow_key || '';
            break;
          case 'status':
            aVal = a.status || '';
            bVal = b.status || '';
            break;
          case 'http':
            aVal = a.http_status || 0;
            bVal = b.http_status || 0;
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [runs, filters, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedRuns.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRuns = filteredAndSortedRuns.slice(startIndex, endIndex);

  return (
    <>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Integration Runs (Last 50)</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : !runs || runs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No integration runs found</div>
        ) : (
          <div className="space-y-4">
            {/* Pagination controls */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Viser {startIndex + 1}-{Math.min(endIndex, filteredAndSortedRuns.length)} av {filteredAndSortedRuns.length} kjøringer
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm">Vis:</span>
                <Button
                  variant={pageSize === 10 ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setPageSize(10); setCurrentPage(1); }}
                >
                  10
                </Button>
                <Button
                  variant={pageSize === 25 ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setPageSize(25); setCurrentPage(1); }}
                >
                  25
                </Button>
                <Button
                  variant={pageSize === 50 ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setPageSize(50); setCurrentPage(1); }}
                >
                  50
                </Button>
              </div>
              
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Forrige
                </Button>
                <span className="text-sm">Side {currentPage} av {totalPages || 1}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  Neste
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="border-b-2">
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('time')}>
                    <div className="flex items-center gap-1">
                      Time
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('provider')}>
                    <div className="flex items-center gap-1">
                      Provider
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('workflow')}>
                    <div className="flex items-center gap-1">
                      Workflow
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('status')}>
                    <div className="flex items-center gap-1">
                      Status
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('http')}>
                    <div className="flex items-center gap-1">
                      HTTP
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead>Request ID</TableHead>
                </TableRow>
                <TableRow>
                  <TableHead className="py-2">
                    <Input
                      placeholder="Filter tid..."
                      value={filters.time}
                      onChange={(e) => setFilters({ ...filters, time: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </TableHead>
                  <TableHead className="py-2">
                    <Input
                      placeholder="Filter provider..."
                      value={filters.provider}
                      onChange={(e) => setFilters({ ...filters, provider: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </TableHead>
                  <TableHead className="py-2">
                    <Input
                      placeholder="Filter workflow..."
                      value={filters.workflow}
                      onChange={(e) => setFilters({ ...filters, workflow: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </TableHead>
                  <TableHead className="py-2">
                    <Input
                      placeholder="Filter status..."
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </TableHead>
                  <TableHead className="py-2">
                    <Input
                      placeholder="Filter HTTP..."
                      value={filters.http}
                      onChange={(e) => setFilters({ ...filters, http: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </TableHead>
                  <TableHead className="py-2">
                    <Input
                      placeholder="Filter request ID..."
                      value={filters.requestId}
                      onChange={(e) => setFilters({ ...filters, requestId: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRuns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Ingen kjøringer matcher filtrene
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRuns.map((run: any) => (
                    <TableRow key={run.id}>
                      <TableCell className="font-mono text-xs">
                        {format(parseISO(run.started_at), "dd.MM.yyyy HH:mm:ss")}
                      </TableCell>
                      <TableCell>{run.provider}</TableCell>
                      <TableCell className="font-mono text-xs">{run.workflow_key}</TableCell>
                      <TableCell>{getStatusBadge(run.status)}</TableCell>
                      <TableCell>{run.http_status || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{run.request_id?.slice(0, 8)}...</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </>
  );
}
