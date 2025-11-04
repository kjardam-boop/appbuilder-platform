import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTenantIsolation } from "@/hooks/useTenantIsolation";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Download, RefreshCw, AlertTriangle, Network } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ForceGraph2D } from "react-force-graph";

interface GraphNode {
  id: string;
  label: string;
  type: string;
  status?: string;
  badges?: string[];
  soft?: boolean;
  metadata?: any;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  status?: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: any;
}

export default function IntegrationGraph() {
  const { tenantId } = useTenantIsolation();
  const [includeRecs, setIncludeRecs] = useState(true);
  const [showSoft, setShowSoft] = useState(true);
  const [showRisk, setShowRisk] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const graphRef = useRef<any>();

  // Fetch graph data
  const { data: graphData, isLoading, refetch } = useQuery({
    queryKey: ["integration-graph", tenantId, includeRecs],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("integration-graph", {
        method: "GET",
        headers: {
          "x-request-id": crypto.randomUUID(),
        },
      });

      if (error) throw error;
      return data?.data as GraphData;
    },
    enabled: !!tenantId,
  });

  // Transform data for react-force-graph
  const graphDataFormatted = {
    nodes: (graphData?.nodes || [])
      .filter((n) => showSoft || !n.soft)
      .map((n) => ({
        ...n,
        id: n.id,
        name: n.label,
        val: n.type === "app" ? 20 : n.type === "system" ? 15 : 10,
      })),
    links: (graphData?.edges || []).map((e) => ({
      source: e.source,
      target: e.target,
      type: e.type,
      status: e.status,
    })),
  };

  const handleExport = async () => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "integration-graph/export",
        {
          method: "GET",
        }
      );

      if (error) throw error;

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `integration-graph-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Graph exported");
    } catch (error: any) {
      toast.error("Export failed: " + error.message);
    }
  };

  const getNodeColor = (node: any) => {
    if (!showRisk) {
      return getTypeColor(node.type);
    }

    if (node.status === "missing" || node.status === "risk") return "#ef4444";
    if (node.status === "orphan") return "#f97316";
    if (node.status === "idle") return "#eab308";
    if (node.status === "recommended") return "#22c55e";
    return getTypeColor(node.type);
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      app: "#3b82f6",
      system: "#a855f7",
      provider: "#6b7280",
      workflow: "#14b8a6",
      secret: "#eab308",
      recommendation: "#22c55e",
    };
    return colors[type] || "#6b7280";
  };

  const getLinkColor = (link: any) => {
    if (link.status === "missing") return "#ef4444";
    if (link.status === "degraded") return "#f97316";
    if (link.status === "recommended") return "#22c55e";
    return "#94a3b8";
  };

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node);
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Network className="h-8 w-8" />
            Integration Graph
          </h1>
          <p className="text-muted-foreground">
            Visual topology of your integration landscape
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      {graphData && (
        <Card>
          <CardHeader>
            <CardTitle>Graph Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              <div>
                <div className="text-2xl font-bold">{graphData.stats.apps}</div>
                <div className="text-sm text-muted-foreground">Apps</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{graphData.stats.systems}</div>
                <div className="text-sm text-muted-foreground">Systems</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{graphData.stats.workflows}</div>
                <div className="text-sm text-muted-foreground">Workflows</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {graphData.stats.missingSecrets}
                </div>
                <div className="text-sm text-muted-foreground">Missing Secrets</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {graphData.stats.orphanWorkflows}
                </div>
                <div className="text-sm text-muted-foreground">Orphan Workflows</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {graphData.stats.unusedSystems}
                </div>
                <div className="text-sm text-muted-foreground">Unused Systems</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Display Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="show-recs">Show Recommendations</Label>
            <Switch
              id="show-recs"
              checked={includeRecs}
              onCheckedChange={setIncludeRecs}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="show-soft">Show Soft Nodes</Label>
            <Switch
              id="show-soft"
              checked={showSoft}
              onCheckedChange={setShowSoft}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="show-risk">Risk Overlay</Label>
            <Switch
              id="show-risk"
              checked={showRisk}
              onCheckedChange={setShowRisk}
            />
          </div>
        </CardContent>
      </Card>

      {/* Graph Visualization */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : graphData ? (
        <Card>
          <CardHeader>
            <CardTitle>Integration Topology</CardTitle>
            <CardDescription>
              Click nodes for details. Drag to rearrange. Scroll to zoom.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[600px] border rounded-lg overflow-hidden bg-slate-950">
              <ForceGraph2D
                ref={graphRef}
                graphData={graphDataFormatted}
                nodeLabel="name"
                nodeColor={getNodeColor}
                linkColor={getLinkColor}
                linkDirectionalArrowLength={3}
                linkDirectionalArrowRelPos={1}
                onNodeClick={handleNodeClick}
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                  const label = node.name;
                  const fontSize = 12 / globalScale;
                  ctx.font = `${fontSize}px Sans-Serif`;
                  
                  const size = node.val || 10;
                  
                  // Draw circle
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
                  ctx.fillStyle = getNodeColor(node);
                  ctx.fill();
                  
                  // Soft node styling
                  if (node.soft) {
                    ctx.globalAlpha = 0.5;
                  }
                  
                  // Risk border
                  if (showRisk && (node.status === "risk" || node.status === "missing")) {
                    ctx.strokeStyle = "#ef4444";
                    ctx.lineWidth = 3 / globalScale;
                    ctx.stroke();
                  }
                  
                  ctx.globalAlpha = 1;
                  
                  // Draw label
                  ctx.textAlign = "center";
                  ctx.textBaseline = "middle";
                  ctx.fillStyle = "#fff";
                  ctx.fillText(label, node.x, node.y + size + fontSize);
                  
                  // Draw badges
                  if (node.badges && node.badges.length > 0) {
                    ctx.fillStyle = "#94a3b8";
                    ctx.font = `${fontSize * 0.8}px Sans-Serif`;
                    ctx.fillText(
                      node.badges.join(" "),
                      node.x,
                      node.y + size + fontSize * 2
                    );
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Node Detail Panel */}
      <Sheet open={!!selectedNode} onOpenChange={() => setSelectedNode(null)}>
        <SheetContent>
          {selectedNode && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedNode.label}</SheetTitle>
                <SheetDescription>
                  <Badge>{selectedNode.type}</Badge>
                  {selectedNode.status && (
                    <Badge variant="outline" className="ml-2">
                      {selectedNode.status}
                    </Badge>
                  )}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4 mt-6">
                {selectedNode.badges && selectedNode.badges.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Badges</h4>
                    <div className="flex gap-2 flex-wrap">
                      {selectedNode.badges.map((badge, idx) => (
                        <Badge key={idx} variant="secondary">
                          {badge}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedNode.status === "missing" && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-red-900">Missing Secret</h4>
                        <p className="text-sm text-red-700 mt-1">
                          This integration requires a secret to be configured.
                        </p>
                        <Button size="sm" className="mt-2">
                          Add Secret
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedNode.status === "idle" && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-yellow-900">Unused System</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          This system is not connected to any workflows.
                        </p>
                        <Button size="sm" className="mt-2">
                          Add Workflow
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedNode.status === "orphan" && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-orange-900">Orphan Workflow</h4>
                        <p className="text-sm text-orange-700 mt-1">
                          This workflow is not connected to any systems.
                        </p>
                        <Button size="sm" className="mt-2">
                          Review Configuration
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedNode.metadata && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Metadata</h4>
                    <pre className="text-xs bg-slate-100 p-2 rounded overflow-auto">
                      {JSON.stringify(selectedNode.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
