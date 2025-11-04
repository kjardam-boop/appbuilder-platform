/**
 * Integration Graph Types
 * Visual representation of integration topology
 */

export type NodeType = "app" | "system" | "provider" | "workflow" | "secret" | "recommendation";
export type NodeStatus = "ok" | "missing" | "risk" | "recommended" | "orphan" | "idle";
export type EdgeType = "activation" | "capability" | "workflow" | "secret" | "recommendation" | "provider";
export type EdgeStatus = "ok" | "missing" | "degraded" | "recommended" | "disabled";

export interface IntegrationGraphNode {
  id: string;
  label: string;
  type: NodeType;
  status?: NodeStatus;
  badges?: string[];
  soft?: boolean; // Faded/recommended but not active
  metadata?: Record<string, any>;
}

export interface IntegrationGraphEdge {
  id: string;
  from: string;
  to: string;
  type: EdgeType;
  status?: EdgeStatus;
  label?: string;
}

export interface IntegrationGraphStats {
  apps: number;
  systems: number;
  workflows: number;
  secrets: number;
  providers: number;
  recommendations: number;
  missingSecrets: number;
  orphanWorkflows: number;
  unusedSystems: number;
}

export interface IntegrationGraphResult {
  nodes: IntegrationGraphNode[];
  edges: IntegrationGraphEdge[];
  stats: IntegrationGraphStats;
}

export interface GraphBuildOptions {
  includeRecommendations?: boolean;
  includeInactive?: boolean;
}

export interface RiskSignal {
  nodeId: string;
  type: "missing_secret" | "unused_system" | "orphan_workflow" | "no_compliance";
  severity: "high" | "medium" | "low";
  message: string;
  remediation?: string;
}
