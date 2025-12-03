/**
 * Compatibility Engine Service
 * Compute fit scores between Platform Apps and External Systems
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  CompatibilityScore,
  SystemScore,
  CapabilityMatch,
  IntegrationReadiness,
  ComplianceMatch,
  ScoreBreakdown,
} from "../types/compatibility.types";

/**
 * Compute fit score between a Platform App and an External System
 */
export async function computeFit(
  tenantId: string,
  appKey: string,
  externalSystemSlug: string
): Promise<CompatibilityScore> {
  // Fetch app definition
  const { data: app } = await supabase
    .from("app_definitions")
    .select("*")
    .eq("key", appKey)
    .single();

  if (!app) {
    throw new Error(`App ${appKey} not found`);
  }

  // Fetch external system
  const { data: system } = await (supabase as any)
    .from("external_systems")
    .select("*, external_system_integrations(*), external_system_erp_data(*)")
    .eq("slug", externalSystemSlug)
    .single();

  if (!system) {
    throw new Error(`System ${externalSystemSlug} not found`);
  }

  // Fetch tenant workflows
  const { data: workflows } = await supabase
    .from("tenant_integrations")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  // Fetch active secrets
  const { data: secrets } = await supabase
    .from("integration_secrets")
    .select("provider")
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  const activeProviders = new Set(secrets?.map((s) => s.provider) || []);

  // 1. Capability Match (40%)
  const capabilityScore = computeCapabilityMatch(app, system);

  // 2. Integration Readiness (30%)
  const integrationScore = computeIntegrationReadiness(
    app,
    system,
    workflows || [],
    activeProviders
  );

  // 3. Localization & Compliance (20%)
  const complianceScore = computeComplianceMatch(app, system);

  // 4. Ecosystem Maturity (10%)
  const ecosystemScore = computeEcosystemMaturity(system);

  // Calculate total score
  const totalScore = Math.round(
    capabilityScore.score * 0.4 +
      integrationScore.score * 0.3 +
      complianceScore.score * 0.2 +
      ecosystemScore.score * 0.1
  );

  // Generate explanations
  const explain = generateExplanations({
    capabilityMatch: capabilityScore,
    integrationReadiness: integrationScore,
    compliance: complianceScore,
    ecosystemMaturity: ecosystemScore,
  });

  // Generate recommendations
  const recommendations = generateRecommendations(
    integrationScore,
    capabilityScore,
    activeProviders
  );

  // Generate badges
  const badges = generateBadges(
    capabilityScore,
    integrationScore,
    complianceScore
  );

  return {
    totalScore,
    breakdown: {
      capabilityMatch: capabilityScore,
      integrationReadiness: integrationScore,
      compliance: complianceScore,
      ecosystemMaturity: ecosystemScore,
    },
    explain,
    recommendations,
    badges,
  };
}

/**
 * Compute compatibility matrix for an app across all systems
 */
export async function computeMatrix(
  tenantId: string,
  appKey: string,
  filters?: { provider?: string; minScore?: number }
): Promise<SystemScore[]> {
  // Fetch all external systems
  const { data: systems } = await (supabase as any)
    .from("external_systems")
    .select("slug, name")
    .order("name");

  if (!systems) return [];

  const scores: SystemScore[] = [];

  for (const system of systems) {
    try {
      const result = await computeFit(tenantId, appKey, system.slug);
      
      if (filters?.minScore && result.totalScore < filters.minScore) {
        continue;
      }

      scores.push({
        systemSlug: system.slug,
        systemName: system.name,
        score: result.totalScore,
        badges: result.badges,
        breakdown: result.breakdown,
      });
    } catch (error) {
      console.error(`Failed to compute fit for ${system.slug}:`, error);
    }
  }

  // Sort by score descending
  return scores.sort((a, b) => b.score - a.score);
}

/**
 * Recommend workflows to create
 */
export function recommendWorkflows(
  appKey: string,
  externalSystemSlug: string,
  compatScore: CompatibilityScore
): string[] {
  const workflows: string[] = [];

  // Based on missing integrations
  const missingIntegrations = compatScore.breakdown.integrationReadiness.details
    .filter((d) => !d.hasWorkflow);

  for (const integration of missingIntegrations) {
    workflows.push(
      `${integration.provider}_${externalSystemSlug}_${appKey}_sync`
    );
  }

  return workflows;
}

// Helper functions

function computeCapabilityMatch(app: any, system: any): ScoreBreakdown["capabilityMatch"] {
  const appCapabilities = (app.capabilities || []) as string[];
  const systemModules = system.erp_extensions?.[0]?.modules || [];
  
  const details: CapabilityMatch[] = appCapabilities.map((cap) => {
    const available = systemModules.some((mod: string) =>
      mod.toLowerCase().includes(cap.toLowerCase())
    );

    return {
      capability: cap,
      required: true,
      available,
      readWrite: available ? "full" : "none",
      score: available ? 1 : 0,
    };
  });

  const score =
    details.length > 0
      ? (details.reduce((sum, d) => sum + d.score, 0) / details.length) * 100
      : 0;

  return {
    score: Math.round(score),
    weight: 0.4,
    details,
  };
}

function computeIntegrationReadiness(
  app: any,
  system: any,
  workflows: any[],
  activeProviders: Set<string>
): ScoreBreakdown["integrationReadiness"] {
  const integrationReqs = (app.integration_requirements || {}) as Record<
    string,
    string[]
  >;
  const systemIntegrations = system.external_system_integrations || [];

  const details: IntegrationReadiness[] = [];

  for (const [reqType, providers] of Object.entries(integrationReqs)) {
    for (const provider of providers) {
      const hasWorkflow = workflows.some(
        (w) => w.adapter_id?.includes(provider)
      );
      const hasMcpRef = systemIntegrations.some(
        (i: any) => i.type === "mcp" && i.name.includes(provider)
      );
      const hasActiveSecret = activeProviders.has(provider);

      let score = 0;
      if (hasWorkflow) score += 1;
      if (hasMcpRef) score += 0.5;
      if (hasActiveSecret) score += 0.1;

      details.push({
        provider,
        hasWorkflow,
        hasMcpRef,
        hasActiveSecret,
        score,
      });
    }
  }

  const maxScore = details.length * 1.6; // Max possible: 1 + 0.5 + 0.1
  const totalScore =
    details.length > 0
      ? (details.reduce((sum, d) => sum + d.score, 0) / maxScore) * 100
      : 0;

  return {
    score: Math.round(totalScore),
    weight: 0.3,
    details,
  };
}

function computeComplianceMatch(
  app: any,
  system: any
): ScoreBreakdown["compliance"] {
  const appCompliances = (app.capabilities || []) as string[];
  const systemCompliances = (system.compliances || []) as string[];

  const details: ComplianceMatch[] = [
    {
      requirement: "GDPR",
      satisfied: systemCompliances.includes("GDPR"),
      score: systemCompliances.includes("GDPR") ? 1 : 0,
    },
    {
      requirement: "SAF-T NO",
      satisfied: systemCompliances.includes("SAF-T NO"),
      score: systemCompliances.includes("SAF-T NO") ? 1 : 0,
    },
  ];

  const score =
    details.length > 0
      ? (details.reduce((sum, d) => sum + d.score, 0) / details.length) * 100
      : 0;

  return {
    score: Math.round(score),
    weight: 0.2,
    details,
  };
}

function computeEcosystemMaturity(
  system: any
): ScoreBreakdown["ecosystemMaturity"] {
  const integrationCount = system.external_system_integrations?.length || 0;
  const mcpRefCount = system.external_system_integrations?.filter(
    (i: any) => i.type === "mcp"
  ).length || 0;

  let score = 0;
  if (integrationCount >= 3) score += 0.5;
  else if (integrationCount >= 1) score += 0.25;

  if (mcpRefCount >= 2) score += 0.5;
  else if (mcpRefCount >= 1) score += 0.25;

  return {
    score: Math.round(score * 100),
    weight: 0.1,
    details: {
      integrationCount,
      mcpRefCount,
      useCaseCount: 0,
    },
  };
}

function generateExplanations(breakdown: ScoreBreakdown): string[] {
  const explain: string[] = [];

  // Capability explanations
  const capMissing = breakdown.capabilityMatch.details.filter((d) => !d.available);
  if (capMissing.length > 0) {
    explain.push(
      `Missing capabilities: ${capMissing.map((c) => c.capability).join(", ")}`
    );
  } else {
    explain.push("All required capabilities are supported");
  }

  // Integration explanations
  const intMissing = breakdown.integrationReadiness.details.filter(
    (d) => !d.hasWorkflow
  );
  if (intMissing.length > 0) {
    explain.push(
      `Missing workflows for: ${intMissing.map((i) => i.provider).join(", ")}`
    );
  }

  // Compliance explanations
  const compMissing = breakdown.compliance.details.filter((d) => !d.satisfied);
  if (compMissing.length > 0) {
    explain.push(
      `Missing compliance: ${compMissing.map((c) => c.requirement).join(", ")}`
    );
  }

  return explain;
}

function generateRecommendations(
  integrationScore: ScoreBreakdown["integrationReadiness"],
  capabilityScore: ScoreBreakdown["capabilityMatch"],
  activeProviders: Set<string>
): string[] {
  const recommendations: string[] = [];

  // Workflow recommendations
  const needsWorkflow = integrationScore.details.filter((d) => !d.hasWorkflow);
  for (const item of needsWorkflow) {
    recommendations.push(`Create workflow mapping for ${item.provider}`);
  }

  // Secret recommendations
  const needsSecret = integrationScore.details.filter(
    (d) => d.hasWorkflow && !d.hasActiveSecret
  );
  for (const item of needsSecret) {
    recommendations.push(`Activate secret for ${item.provider}`);
  }

  // MCP recommendations
  const needsMcp = integrationScore.details.filter((d) => !d.hasMcpRef);
  for (const item of needsMcp) {
    if (needsMcp.length <= 2) {
      recommendations.push(`Add MCP reference for ${item.provider}`);
    }
  }

  return recommendations;
}

function generateBadges(
  capabilityScore: ScoreBreakdown["capabilityMatch"],
  integrationScore: ScoreBreakdown["integrationReadiness"],
  complianceScore: ScoreBreakdown["compliance"]
): string[] {
  const badges: string[] = [];

  if (capabilityScore.score < 50) {
    badges.push("Limited capabilities");
  }

  const noWorkflow = integrationScore.details.filter((d) => !d.hasWorkflow);
  if (noWorkflow.length > 0) {
    badges.push("Missing workflows");
  }

  const noSecret = integrationScore.details.filter((d) => !d.hasActiveSecret);
  if (noSecret.length > 0) {
    badges.push("No active secrets");
  }

  if (complianceScore.score < 100) {
    badges.push("Incomplete compliance");
  }

  return badges;
}
