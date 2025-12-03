import { supabase } from "@/integrations/supabase/client";
import type {
  IntegrationRecommendation,
  RecommendOptions,
  RecommendationMatrixRow,
  ComputeResult,
  CapabilityFitResult,
  IntegrationReadinessResult,
  ComplianceScoreResult,
  MaturityScoreResult,
  ExplainItem,
  Suggestion,
  ScoreBreakdown,
} from "../types/recommendation.types";

// Scoring weights
const WEIGHTS = {
  CAPABILITY_FIT: 0.4,
  INTEGRATION_READINESS: 0.3,
  COMPLIANCE: 0.2,
  MATURITY: 0.1,
};

export class RecommendationService {
  /**
   * Compute recommendations for a specific app
   */
  static async computeForApp(
    tenantId: string,
    appKey: string
  ): Promise<IntegrationRecommendation[]> {
    // Get app definition
    const { data: app } = await supabase
      .from("applications")
      .select(`
        *,
        app_definition:app_definitions(*)
      `)
      .eq("tenant_id", tenantId)
      .single();

    if (!app) return [];

    // Get all candidate external systems
    const { data: systems } = await (supabase as any)
      .from("external_systems")
      .select(`
        *,
        vendor:external_system_vendors(*),
        integrations:external_system_integrations(*)
      `);

    if (!systems) return [];

    // Get tenant context
    const tenantContext = await this.getTenantContext(tenantId);

    // Compute scores for each system
    const recommendations: IntegrationRecommendation[] = [];

    for (const system of systems) {
      const score = await this.computeScore(app, system, tenantContext);
      
      if (score.total >= 20) { // Only include if score >= 20
        recommendations.push({
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          app_key: appKey,
          system_product_id: system.id,
          provider: this.detectProvider(system),
          workflow_key: null,
          score: score.total,
          breakdown: score.breakdown,
          explain: score.explain,
          suggestions: score.suggestions,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    // Sort by score descending
    recommendations.sort((a, b) => b.score - a.score);

    return recommendations;
  }

  /**
   * Compute recommendations for all tenant apps
   */
  static async computeForTenant(
    tenantId: string
  ): Promise<Record<string, IntegrationRecommendation[]>> {
    const { data: apps } = await supabase
      .from("applications")
      .select("id, app_definition:app_definitions(key)")
      .eq("tenant_id", tenantId);

    if (!apps) return {};

    const result: Record<string, IntegrationRecommendation[]> = {};

    for (const app of apps) {
      const appKey = (app.app_definition as any)?.key;
      if (appKey) {
        result[appKey] = await this.computeForApp(tenantId, appKey);
      }
    }

    return result;
  }

  /**
   * Compute matrix view (system × app)
   */
  static async computeMatrix(
    tenantId: string,
    appKeys?: string[]
  ): Promise<RecommendationMatrixRow[]> {
    const recommendations = await this.computeForTenant(tenantId);
    const matrix: Map<string, RecommendationMatrixRow> = new Map();

    for (const [appKey, recs] of Object.entries(recommendations)) {
      if (appKeys && !appKeys.includes(appKey)) continue;

      for (const rec of recs) {
        const key = rec.system_product_id;
        
        if (!matrix.has(key)) {
          // Get system name
          const { data: product } = await (supabase as any)
            .from("external_systems")
            .select("name")
            .eq("id", key)
            .single();

          matrix.set(key, {
            system_product_id: key,
            system_name: product?.name || "Unknown",
            scores_by_app: {},
          });
        }

        const row = matrix.get(key)!;
        row.scores_by_app[appKey] = rec.score;
      }
    }

    return Array.from(matrix.values());
  }

  /**
   * Persist recommendations to database
   */
  static async persistRecommendations(
    tenantId: string,
    appKey: string,
    recommendations: IntegrationRecommendation[]
  ): Promise<void> {
    // Delete old recommendations for this app
    await supabase
      .from("integration_recommendation")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("app_key", appKey);

    // Insert new recommendations (top 20)
    const top20 = recommendations.slice(0, 20);
    
    if (top20.length > 0) {
      const { error } = await supabase
        .from("integration_recommendation")
        .insert(
          top20.map((rec) => ({
            tenant_id: rec.tenant_id,
            app_key: rec.app_key,
            system_product_id: rec.system_product_id,
            provider: rec.provider,
            workflow_key: rec.workflow_key,
            score: rec.score,
            breakdown: rec.breakdown as any,
            explain: rec.explain as any,
            suggestions: rec.suggestions as any,
          }))
        );

      if (error) throw error;
    }
  }

  /**
   * Get persisted recommendations
   */
  static async getRecommendations(
    options: RecommendOptions
  ): Promise<ComputeResult[]> {
    let query = (supabase as any)
      .from("integration_recommendation")
      .select(`
        *,
        product:external_systems(id, name, slug, vendor:external_system_vendors(name))
      `)
      .eq("tenant_id", options.tenantId)
      .order("score", { ascending: false });

    if (options.appKey) {
      query = query.eq("app_key", options.appKey);
    }

    if (options.providers && options.providers.length > 0) {
      query = query.in("provider", options.providers);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Group by app_key
    const grouped: Record<string, IntegrationRecommendation[]> = {};
    
    for (const rec of data || []) {
      if (!grouped[rec.app_key]) {
        grouped[rec.app_key] = [];
      }
      grouped[rec.app_key].push(rec as any);
    }

    return Object.entries(grouped).map(([appKey, items]) => ({
      appKey,
      items,
    }));
  }

  // ===== SCORING HELPERS =====

  private static async computeScore(
    app: any,
    system: any,
    context: any
  ): Promise<{
    total: number;
    breakdown: ScoreBreakdown;
    explain: ExplainItem[];
    suggestions: Suggestion[];
  }> {
    const capFit = this.computeCapabilityFit(app, system);
    const intReady = await this.computeIntegrationReadiness(context, app, system);
    const compliance = this.computeComplianceScore(context, system);
    const maturity = this.computeMaturity(system);

    const total = Math.round(
      WEIGHTS.CAPABILITY_FIT * capFit.score +
        WEIGHTS.INTEGRATION_READINESS * intReady.score +
        WEIGHTS.COMPLIANCE * compliance.score +
        WEIGHTS.MATURITY * maturity.score
    );

    const explain: ExplainItem[] = [
      ...capFit.evidence,
      ...intReady.evidence,
      ...compliance.evidence,
      ...maturity.evidence,
    ];

    const suggestions = this.deriveNextSteps(app, system, context, intReady);

    return {
      total,
      breakdown: {
        capability_fit: Math.round(capFit.score),
        integration_readiness: Math.round(intReady.score),
        compliance: Math.round(compliance.score),
        maturity: Math.round(maturity.score),
        total,
      },
      explain,
      suggestions,
    };
  }

  private static computeCapabilityFit(
    app: any,
    system: any
  ): CapabilityFitResult {
    const evidence: ExplainItem[] = [];
    let matches = 0;
    let total = 0;

    // Check API capabilities
    const apiFeatures = ['rest_api', 'graphql', 'webhooks', 'oauth2', 'api_keys'];
    for (const feature of apiFeatures) {
      total++;
      if (system[feature]) {
        matches++;
        evidence.push({
          category: "capability",
          message: `Supports ${feature.replace('_', ' ')}`,
          impact: "positive",
        });
      }
    }

    // Check integration capabilities
    const integrationFeatures = ['n8n_node', 'zapier_app', 'pipedream_support', 'mcp_connector'];
    for (const feature of integrationFeatures) {
      total++;
      if (system[feature]) {
        matches += 0.5;
        evidence.push({
          category: "capability",
          message: `Has ${feature.replace('_', ' ')} integration`,
          impact: "positive",
        });
      }
    }

    const score = total > 0 ? (matches / total) * 100 : 0;

    return { score, evidence };
  }

  private static async computeIntegrationReadiness(
    context: any,
    app: any,
    system: any
  ): Promise<IntegrationReadinessResult> {
    const evidence: ExplainItem[] = [];
    let score = 0;
    let maxScore = 3;

    // Check workflow mapping
    const hasWorkflow = context.workflows.some((w: any) => 
      w.workflow_key.includes(system.slug)
    );
    
    if (hasWorkflow) {
      score += 1;
      evidence.push({
        category: "integration",
        message: "Active workflow mapping exists",
        impact: "positive",
      });
    } else {
      evidence.push({
        category: "integration",
        message: "No workflow mapping configured",
        impact: "negative",
      });
    }

    // Check connector availability
    if (system.n8n_node || system.zapier_app || system.pipedream_support || system.mcp_connector) {
      score += 0.5;
      evidence.push({
        category: "integration",
        message: "Integration connector available",
        impact: "positive",
      });
    }

    // Check secrets
    const hasSecret = context.secrets.some((s: any) => 
      s.provider === 'n8n' && s.is_active
    );
    
    if (hasSecret) {
      score += 0.5;
      evidence.push({
        category: "integration",
        message: "Integration secret configured",
        impact: "positive",
      });
    } else {
      evidence.push({
        category: "integration",
        message: "No integration secret found",
        impact: "negative",
      });
    }

    return {
      score: (score / maxScore) * 100,
      evidence,
    };
  }

  private static computeComplianceScore(
    context: any,
    system: any
  ): ComplianceScoreResult {
    const evidence: ExplainItem[] = [];
    let matches = 0;
    let total = 3;

    // EU data residency
    if (context.tenant.region === 'EU') {
      if (system.eu_data_residency) {
        matches++;
        evidence.push({
          category: "compliance",
          message: "EU data residency available",
          impact: "positive",
        });
      } else {
        evidence.push({
          category: "compliance",
          message: "No EU data residency - review data transfer risk",
          impact: "negative",
        });
      }
    } else {
      matches++; // Not EU, so not a concern
    }

    // GDPR
    if (system.gdpr_statement_url) {
      matches++;
      evidence.push({
        category: "compliance",
        message: "GDPR documentation available",
        impact: "positive",
      });
    }

    // SSO
    if (system.sso) {
      matches++;
      evidence.push({
        category: "compliance",
        message: "SSO support available",
        impact: "positive",
      });
    }

    return {
      score: (matches / total) * 100,
      evidence,
    };
  }

  private static computeMaturity(system: any): MaturityScoreResult {
    const evidence: ExplainItem[] = [];
    let score = 0;

    // Check integration count
    const integrationCount = system.integrations?.length || 0;
    if (integrationCount > 5) {
      score = 100;
      evidence.push({
        category: "maturity",
        message: `Rich integration ecosystem (${integrationCount} integrations)`,
        impact: "positive",
      });
    } else if (integrationCount > 2) {
      score = 60;
      evidence.push({
        category: "maturity",
        message: `Moderate integration support (${integrationCount} integrations)`,
        impact: "neutral",
      });
    } else {
      score = 30;
      evidence.push({
        category: "maturity",
        message: `Limited integration ecosystem`,
        impact: "neutral",
      });
    }

    return { score, evidence };
  }

  private static deriveNextSteps(
    app: any,
    system: any,
    context: any,
    readiness: IntegrationReadinessResult
  ): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Check for missing workflow mapping
    const hasWorkflow = context.workflows.some((w: any) => 
      w.workflow_key.includes(system.slug)
    );
    
    if (!hasWorkflow && (system.n8n_node || system.zapier_app)) {
      suggestions.push({
        action: "add_mapping",
        title: "Add Workflow Mapping",
        description: `Configure workflow mapping for ${system.name}`,
        priority: "high",
        metadata: { system_slug: system.slug },
      });
    }

    // Check for missing secret
    const hasSecret = context.secrets.some((s: any) => s.is_active);
    
    if (!hasSecret) {
      suggestions.push({
        action: "activate_secret",
        title: "Activate Integration Secret",
        description: "Set up authentication for external integrations",
        priority: "high",
      });
    }

    // Compliance review
    if (context.tenant.region === 'EU' && !system.eu_data_residency) {
      suggestions.push({
        action: "review_compliance",
        title: "Review Data Residency",
        description: "This system may not support EU data residency",
        priority: "medium",
      });
    }

    return suggestions;
  }

  private static async getTenantContext(tenantId: string) {
    // Get workflows
    const { data: workflows } = await supabase
      .from("integration_run")
      .select("workflow_key, provider")
      .eq("tenant_id", tenantId)
      .limit(100);

    // Get secrets (mock - would query integration_secrets if exists)
    const secrets: any[] = [];

    // Get tenant info
    const { data: tenant } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .single();

    return {
      workflows: workflows || [],
      secrets,
      tenant: tenant || { region: 'EU' },
    };
  }

  private static detectProvider(system: any): "n8n" | "pipedream" | "native" | "mcp" {
    if (system.mcp_connector) return "mcp";
    if (system.n8n_node) return "n8n";
    if (system.pipedream_support) return "pipedream";
    return "native";
  }
}
