import { BaseEntity } from "@/core/types/common.types";

/**
 * Integration Recommendation
 */
export interface IntegrationRecommendation extends BaseEntity {
  tenant_id: string;
  app_key: string;
  system_product_id: string;
  provider: "n8n" | "pipedream" | "native" | "mcp";
  workflow_key: string | null;
  score: number;
  breakdown: ScoreBreakdown;
  explain: ExplainItem[];
  suggestions: Suggestion[];
}

export interface ScoreBreakdown {
  capability_fit: number;
  integration_readiness: number;
  compliance: number;
  maturity: number;
  total: number;
}

export interface ExplainItem {
  category: "capability" | "integration" | "compliance" | "maturity";
  message: string;
  impact: "positive" | "negative" | "neutral";
}

export interface Suggestion {
  action: "add_mapping" | "activate_secret" | "enable_module" | "review_compliance" | "consider_alternative";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  metadata?: Record<string, any>;
}

export interface RecommendOptions {
  tenantId: string;
  appKey?: string;
  limit?: number;
  providers?: string[];
  includeExplain?: boolean;
}

export interface RecommendationMatrixRow {
  system_product_id: string;
  system_name: string;
  scores_by_app: Record<string, number>;
}

export interface ComputeResult {
  appKey: string;
  items: IntegrationRecommendation[];
}

export interface CapabilityFitResult {
  score: number;
  evidence: ExplainItem[];
}

export interface IntegrationReadinessResult {
  score: number;
  evidence: ExplainItem[];
}

export interface ComplianceScoreResult {
  score: number;
  evidence: ExplainItem[];
}

export interface MaturityScoreResult {
  score: number;
  evidence: ExplainItem[];
}
