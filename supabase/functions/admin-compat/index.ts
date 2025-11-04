import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
};

interface CapabilityMatch {
  capability: string;
  required: boolean;
  available: boolean;
  readWrite: 'full' | 'read-only' | 'none';
  score: number;
}

interface IntegrationReadiness {
  provider: string;
  hasWorkflow: boolean;
  hasMcpRef: boolean;
  hasActiveSecret: boolean;
  score: number;
}

interface ComplianceMatch {
  requirement: string;
  satisfied: boolean;
  score: number;
}

interface ScoreBreakdown {
  capabilityMatch: {
    score: number;
    weight: number;
    details: CapabilityMatch[];
  };
  integrationReadiness: {
    score: number;
    weight: number;
    details: IntegrationReadiness[];
  };
  compliance: {
    score: number;
    weight: number;
    details: ComplianceMatch[];
  };
  ecosystemMaturity: {
    score: number;
    weight: number;
    details: {
      integrationCount: number;
      mcpRefCount: number;
      useCaseCount: number;
    };
  };
}

async function computeFit(
  supabaseClient: any,
  tenantId: string,
  appKey: string,
  externalSystemSlug: string
) {
  // Fetch app definition
  const { data: app } = await supabaseClient
    .from('app_definitions')
    .select('*')
    .eq('key', appKey)
    .single();

  if (!app) throw new Error('APP_NOT_FOUND');

  // Fetch external system
  const { data: system } = await supabaseClient
    .from('app_products')
    .select('*, app_integrations(*), erp_extensions(*)')
    .eq('slug', externalSystemSlug)
    .single();

  if (!system) throw new Error('SYSTEM_NOT_FOUND');

  // Fetch tenant workflows
  const { data: workflows } = await supabaseClient
    .from('tenant_integrations')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  // Fetch active secrets
  const { data: secrets } = await supabaseClient
    .from('mcp_tenant_secret')
    .select('provider')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  const activeProviders = new Set(secrets?.map((s: any) => s.provider) || []);

  // 1. Capability Match (40%)
  const appCapabilities = (app.capabilities || []) as string[];
  const systemModules = system.erp_extensions?.[0]?.modules || [];
  
  const capDetails: CapabilityMatch[] = appCapabilities.map((cap) => {
    const available = systemModules.some((mod: string) =>
      mod.toLowerCase().includes(cap.toLowerCase())
    );
    return {
      capability: cap,
      required: true,
      available,
      readWrite: available ? 'full' : 'none',
      score: available ? 1 : 0,
    };
  });

  const capScore = capDetails.length > 0
    ? (capDetails.reduce((sum, d) => sum + d.score, 0) / capDetails.length) * 100
    : 0;

  // 2. Integration Readiness (30%)
  const integrationReqs = (app.integration_requirements || {}) as Record<string, string[]>;
  const systemIntegrations = system.app_integrations || [];

  const intDetails: IntegrationReadiness[] = [];
  for (const [_reqType, providers] of Object.entries(integrationReqs)) {
    for (const provider of providers) {
      const hasWorkflow = workflows?.some((w: any) => w.adapter_id?.includes(provider));
      const hasMcpRef = systemIntegrations.some(
        (i: any) => i.type === 'mcp' && i.name.includes(provider)
      );
      const hasActiveSecret = activeProviders.has(provider);

      let score = 0;
      if (hasWorkflow) score += 1;
      if (hasMcpRef) score += 0.5;
      if (hasActiveSecret) score += 0.1;

      intDetails.push({
        provider,
        hasWorkflow,
        hasMcpRef,
        hasActiveSecret,
        score,
      });
    }
  }

  const maxIntScore = intDetails.length * 1.6;
  const intScore = intDetails.length > 0
    ? (intDetails.reduce((sum, d) => sum + d.score, 0) / maxIntScore) * 100
    : 0;

  // 3. Compliance (20%)
  const systemCompliances = (system.compliances || []) as string[];
  const compDetails: ComplianceMatch[] = [
    {
      requirement: 'GDPR',
      satisfied: systemCompliances.includes('GDPR'),
      score: systemCompliances.includes('GDPR') ? 1 : 0,
    },
    {
      requirement: 'SAF-T NO',
      satisfied: systemCompliances.includes('SAF-T NO'),
      score: systemCompliances.includes('SAF-T NO') ? 1 : 0,
    },
  ];

  const compScore = compDetails.length > 0
    ? (compDetails.reduce((sum, d) => sum + d.score, 0) / compDetails.length) * 100
    : 0;

  // 4. Ecosystem Maturity (10%)
  const integrationCount = systemIntegrations.length || 0;
  const mcpRefCount = systemIntegrations.filter((i: any) => i.type === 'mcp').length || 0;

  let ecoScore = 0;
  if (integrationCount >= 3) ecoScore += 0.5;
  else if (integrationCount >= 1) ecoScore += 0.25;
  if (mcpRefCount >= 2) ecoScore += 0.5;
  else if (mcpRefCount >= 1) ecoScore += 0.25;

  const breakdown: ScoreBreakdown = {
    capabilityMatch: { score: Math.round(capScore), weight: 0.4, details: capDetails },
    integrationReadiness: { score: Math.round(intScore), weight: 0.3, details: intDetails },
    compliance: { score: Math.round(compScore), weight: 0.2, details: compDetails },
    ecosystemMaturity: {
      score: Math.round(ecoScore * 100),
      weight: 0.1,
      details: { integrationCount, mcpRefCount, useCaseCount: 0 },
    },
  };

  const totalScore = Math.round(
    capScore * 0.4 + intScore * 0.3 + compScore * 0.2 + ecoScore * 100 * 0.1
  );

  // Explanations
  const explain: string[] = [];
  const capMissing = capDetails.filter((d) => !d.available);
  if (capMissing.length > 0) {
    explain.push(`Missing capabilities: ${capMissing.map((c) => c.capability).join(', ')}`);
  }
  const intMissing = intDetails.filter((d) => !d.hasWorkflow);
  if (intMissing.length > 0) {
    explain.push(`Missing workflows for: ${intMissing.map((i) => i.provider).join(', ')}`);
  }

  // Recommendations
  const recommendations: string[] = [];
  for (const item of intMissing) {
    recommendations.push(`Create workflow mapping for ${item.provider}`);
  }
  const needsSecret = intDetails.filter((d) => d.hasWorkflow && !d.hasActiveSecret);
  for (const item of needsSecret) {
    recommendations.push(`Activate secret for ${item.provider}`);
  }

  // Badges
  const badges: string[] = [];
  if (capScore < 50) badges.push('Limited capabilities');
  if (intMissing.length > 0) badges.push('Missing workflows');
  if (needsSecret.length > 0) badges.push('No active secrets');
  if (compScore < 100) badges.push('Incomplete compliance');

  return { totalScore, breakdown, explain, recommendations, badges };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) throw new Error('UNAUTHORIZED');

    // Get tenant context
    const { data: userRoles } = await supabaseClient
      .from('user_roles')
      .select('role, scope_id, scope_type')
      .eq('user_id', user.id)
      .eq('scope_type', 'tenant');

    const tenantRole = userRoles?.[0];
    if (!tenantRole) throw new Error('FORBIDDEN');

    const tenantId = tenantRole.scope_id;
    const url = new URL(req.url);

    // GET /score?appKey=X&system=Y
    if (req.method === 'GET' && url.pathname.includes('/score')) {
      const appKey = url.searchParams.get('appKey');
      const systemSlug = url.searchParams.get('system');

      if (!appKey || !systemSlug) {
        throw new Error('MISSING_PARAMETERS');
      }

      const result = await computeFit(supabaseClient, tenantId, appKey, systemSlug);

      console.log(JSON.stringify({
        level: 'info',
        msg: 'mcp.compat.score.computed',
        tenant_id: tenantId,
        app_key: appKey,
        system: systemSlug,
        score: result.totalScore,
        request_id: requestId,
      }));

      return new Response(
        JSON.stringify({ ok: true, data: result, metadata: { request_id: requestId } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId } }
      );
    }

    // GET /matrix?appKey=X
    if (req.method === 'GET' && url.pathname.includes('/matrix')) {
      const appKey = url.searchParams.get('appKey');
      if (!appKey) throw new Error('MISSING_APP_KEY');

      const { data: systems } = await supabaseClient
        .from('app_products')
        .select('slug, name')
        .order('name');

      const scores = [];
      for (const system of systems || []) {
        try {
          const result = await computeFit(supabaseClient, tenantId, appKey, system.slug);
          scores.push({
            systemSlug: system.slug,
            systemName: system.name,
            score: result.totalScore,
            badges: result.badges,
          });
        } catch (err) {
          console.error(`Failed to compute fit for ${system.slug}:`, err);
        }
      }

      scores.sort((a, b) => b.score - a.score);

      return new Response(
        JSON.stringify({ ok: true, data: scores, metadata: { request_id: requestId } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId } }
      );
    }

    throw new Error('NOT_FOUND');

  } catch (err) {
    const error = err as Error;
    console.error(JSON.stringify({
      level: 'error',
      msg: 'admin_compat_error',
      error: error.message,
      request_id: requestId,
    }));

    const statusMap: Record<string, number> = {
      'UNAUTHORIZED': 401,
      'FORBIDDEN': 403,
      'NOT_FOUND': 404,
      'APP_NOT_FOUND': 404,
      'SYSTEM_NOT_FOUND': 404,
      'MISSING_PARAMETERS': 400,
      'MISSING_APP_KEY': 400,
    };

    return new Response(
      JSON.stringify({
        ok: false,
        error: { code: error.message, message: error.message },
        metadata: { request_id: requestId },
      }),
      {
        status: statusMap[error.message] || 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      }
    );
  }
});
