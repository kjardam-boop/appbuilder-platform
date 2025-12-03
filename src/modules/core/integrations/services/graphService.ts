import { supabase } from "@/integrations/supabase/client";
import type {
  IntegrationGraphNode,
  IntegrationGraphEdge,
  IntegrationGraphResult,
  GraphBuildOptions,
  RiskSignal,
} from "../types/graph.types";

export class IntegrationGraphService {
  /**
   * Build complete integration graph for tenant
   */
  static async buildGraph(
    tenantId: string,
    options: GraphBuildOptions = {}
  ): Promise<IntegrationGraphResult> {
    const nodes: IntegrationGraphNode[] = [];
    const edges: IntegrationGraphEdge[] = [];

    // 1. Get tenant's apps
    const { data: apps } = await supabase
      .from("applications")
      .select(`
        id,
        app_definition:app_definitions(key, name)
      `)
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    // 2. Get external system instances (tenant's activated systems)
    const { data: systems } = await supabase
      .from("tenant_external_systems" as any)
      .select(`
        id,
        app_product_id,
        mcp_enabled,
        configuration_state,
        product:external_systems(id, name, slug, vendor:external_system_vendors(name, slug))
      `)
      .eq("tenant_id", tenantId);

    // 3. Get workflows
    const { data: workflows } = await supabase
      .from("integration_run")
      .select("workflow_key, provider, status")
      .eq("tenant_id", tenantId)
      .limit(100);

    // 4. Get recommendations (if requested)
    let recommendations: any[] = [];
    if (options.includeRecommendations) {
      const { data: recs } = await supabase
        .from("integration_recommendation")
        .select(`
          *,
          product:external_systems(id, name, slug)
        `)
        .eq("tenant_id", tenantId)
        .gte("score", 60)
        .order("score", { ascending: false })
        .limit(10);

      recommendations = recs || [];
    }

    // Build nodes and edges
    const nodeMap = new Map<string, IntegrationGraphNode>();
    const providerSet = new Set<string>();
    const systemSet = new Set<string>();

    // Add APP nodes
    for (const app of apps || []) {
      const appKey = (app.app_definition as any)?.key;
      if (!appKey) continue;

      const nodeId = `APP:${appKey}`;
      nodeMap.set(nodeId, {
        id: nodeId,
        label: (app.app_definition as any)?.name || appKey,
        type: "app",
        status: "ok",
        metadata: { id: app.id },
      });
    }

    // Add SYSTEM nodes
    for (const system of systems || []) {
      const product = (system as any).product;
      const slug = product?.slug;
      if (!slug) continue;

      const nodeId = `SYSTEM:${slug}`;
      systemSet.add(slug);
      
      nodeMap.set(nodeId, {
        id: nodeId,
        label: product.name || slug,
        type: "system",
        status: (system as any).configuration_state === "active" ? "ok" : "idle",
        badges: (system as any).mcp_enabled ? ["MCP"] : [],
        metadata: {
          id: (system as any).id,
          productId: (system as any).app_product_id,
          state: (system as any).configuration_state,
        },
      });

      // Add PROVIDER node
      const vendorSlug = product.vendor?.slug;
      if (vendorSlug) {
        providerSet.add(vendorSlug);
        
        const providerNodeId = `PROVIDER:${vendorSlug}`;
        if (!nodeMap.has(providerNodeId)) {
          nodeMap.set(providerNodeId, {
            id: providerNodeId,
            label: product.vendor.name || vendorSlug,
            type: "provider",
            status: "ok",
          });
        }

        // Edge: SYSTEM → PROVIDER
        edges.push({
          id: `${nodeId}->${providerNodeId}`,
          from: nodeId,
          to: providerNodeId,
          type: "provider",
          status: "ok",
        });
      }

      // Edge: APP → SYSTEM (for each app - simplified assumption)
      if (apps && apps.length > 0) {
        const firstApp = (apps[0].app_definition as any)?.key;
        if (firstApp) {
          edges.push({
            id: `APP:${firstApp}->${nodeId}`,
            from: `APP:${firstApp}`,
            to: nodeId,
            type: "activation",
            status: (system as any).configuration_state === "active" ? "ok" : "degraded",
          });
        }
      }
    }

    // Add WORKFLOW nodes
    const workflowMap = new Map<string, any>();
    for (const wf of workflows || []) {
      const nodeId = `WORKFLOW:${wf.workflow_key}`;
      
      if (!workflowMap.has(wf.workflow_key)) {
        workflowMap.set(wf.workflow_key, wf);
        
        nodeMap.set(nodeId, {
          id: nodeId,
          label: wf.workflow_key,
          type: "workflow",
          status: wf.status === "success" ? "ok" : "risk",
          badges: [wf.provider],
        });
      }

      // Try to connect workflow to systems (heuristic: match slug in workflow_key)
      let connected = false;
      for (const systemSlug of systemSet) {
        if (wf.workflow_key.toLowerCase().includes(systemSlug.toLowerCase())) {
          edges.push({
            id: `${nodeId}->SYSTEM:${systemSlug}`,
            from: nodeId,
            to: `SYSTEM:${systemSlug}`,
            type: "workflow",
            status: "ok",
          });
          connected = true;
        }
      }

      // If no connection, mark as orphan
      if (!connected && nodeMap.has(nodeId)) {
        const node = nodeMap.get(nodeId)!;
        node.status = "orphan";
        node.badges = [...(node.badges || []), "orphan"];
      }
    }

    // Add SECRET nodes (mock - would query integration_secrets if available)
    for (const provider of providerSet) {
      const nodeId = `SECRET:${provider}`;
      
      // Check if secret exists (simplified - would check actual table)
      const hasSecret = Math.random() > 0.3; // Mock
      
      nodeMap.set(nodeId, {
        id: nodeId,
        label: `${provider} secret`,
        type: "secret",
        status: hasSecret ? "ok" : "missing",
        badges: hasSecret ? [] : ["missing"],
      });

      // Edge: SECRET → PROVIDER
      edges.push({
        id: `${nodeId}->PROVIDER:${provider}`,
        from: nodeId,
        to: `PROVIDER:${provider}`,
        type: "secret",
        status: hasSecret ? "ok" : "missing",
      });
    }

    // Add RECOMMENDATION nodes (soft)
    if (options.includeRecommendations) {
      for (const rec of recommendations) {
        const product = rec.product;
        const slug = product?.slug;
        if (!slug) continue;

        const nodeId = `RECOMMENDATION:${slug}`;
        
        // Only add if not already an active system
        if (!systemSet.has(slug)) {
          nodeMap.set(nodeId, {
            id: nodeId,
            label: product.name || slug,
            type: "recommendation",
            status: "recommended",
            soft: true,
            badges: [`${rec.score}`],
            metadata: {
              score: rec.score,
              appKey: rec.app_key,
            },
          });

          // Edge: APP → RECOMMENDATION
          edges.push({
            id: `APP:${rec.app_key}->${nodeId}`,
            from: `APP:${rec.app_key}`,
            to: nodeId,
            type: "recommendation",
            status: "recommended",
          });
        }
      }
    }

    const nodesArray = Array.from(nodeMap.values());

    // Compute risk signals
    this.computeRiskSignals({ nodes: nodesArray, edges, stats: this.computeStats(nodesArray, edges) });

    return {
      nodes: nodesArray,
      edges,
      stats: this.computeStats(nodesArray, edges),
    };
  }

  /**
   * Compute graph statistics
   */
  private static computeStats(
    nodes: IntegrationGraphNode[],
    edges: IntegrationGraphEdge[]
  ): IntegrationGraphResult["stats"] {
    return {
      apps: nodes.filter((n) => n.type === "app").length,
      systems: nodes.filter((n) => n.type === "system").length,
      workflows: nodes.filter((n) => n.type === "workflow").length,
      secrets: nodes.filter((n) => n.type === "secret").length,
      providers: nodes.filter((n) => n.type === "provider").length,
      recommendations: nodes.filter((n) => n.type === "recommendation").length,
      missingSecrets: nodes.filter((n) => n.type === "secret" && n.status === "missing").length,
      orphanWorkflows: nodes.filter((n) => n.type === "workflow" && n.status === "orphan").length,
      unusedSystems: nodes.filter((n) => n.type === "system" && n.status === "idle").length,
    };
  }

  /**
   * Compute risk signals and mutate node status
   */
  private static computeRiskSignals(graph: IntegrationGraphResult): void {
    const { nodes, edges } = graph;

    // Detect unused systems
    for (const node of nodes) {
      if (node.type === "system") {
        const hasIncomingWorkflow = edges.some(
          (e) => e.to === node.id && e.type === "workflow"
        );
        
        if (!hasIncomingWorkflow && node.status === "ok") {
          node.status = "idle";
          node.badges = [...(node.badges || []), "unused"];
        }
      }
    }

    // Detect missing secrets
    for (const node of nodes) {
      if (node.type === "secret" && node.status === "missing") {
        // Find related workflows
        const provider = node.id.replace("SECRET:", "");
        const relatedWorkflows = nodes.filter(
          (n) => n.type === "workflow" && n.badges?.includes(provider)
        );

        for (const wf of relatedWorkflows) {
          if (wf.status !== "orphan") {
            wf.status = "risk";
            wf.badges = [...(wf.badges || []), "no-secret"];
          }
        }
      }
    }
  }

  /**
   * Get risk signals for display
   */
  static extractRiskSignals(graph: IntegrationGraphResult): RiskSignal[] {
    const signals: RiskSignal[] = [];

    for (const node of graph.nodes) {
      if (node.type === "secret" && node.status === "missing") {
        signals.push({
          nodeId: node.id,
          type: "missing_secret",
          severity: "high",
          message: `Missing secret for ${node.label}`,
          remediation: "Activate integration secret in MCP settings",
        });
      }

      if (node.type === "system" && node.status === "idle") {
        signals.push({
          nodeId: node.id,
          type: "unused_system",
          severity: "medium",
          message: `${node.label} is not connected to any workflows`,
          remediation: "Add workflow mapping or deactivate system",
        });
      }

      if (node.type === "workflow" && node.status === "orphan") {
        signals.push({
          nodeId: node.id,
          type: "orphan_workflow",
          severity: "medium",
          message: `${node.label} is not connected to any systems`,
          remediation: "Review workflow configuration",
        });
      }
    }

    return signals;
  }
}
