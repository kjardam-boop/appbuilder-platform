import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenantId } = await req.json();

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: "tenantId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch tenant data
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, name, slug, settings")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: "Tenant not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch branding theme
    const { data: theme } = await supabase
      .from("tenant_themes")
      .select("tokens, extracted_from_url")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .maybeSingle();

    // Fetch company info if linked
    const settings = tenant.settings as any;
    const companyId = settings?.company_id;
    let company = null;
    if (companyId) {
      const { data: companyData } = await supabase
        .from("companies")
        .select("name, website, org_number")
        .eq("id", companyId)
        .maybeSingle();
      company = companyData;
    }

    // Generate app config using OpenAI
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `Generate a web application configuration for a business.

Tenant: ${tenant.name}
${company ? `Company: ${company.name}${company.website ? ` (${company.website})` : ''}` : ''}
${theme ? `Brand colors: Primary ${theme.tokens?.primary}, Accent ${theme.tokens?.accent}` : ''}

Generate a JSON configuration with:
- name: Application name (based on tenant/company name)
- description: Brief description (1-2 sentences)
- suggested_capabilities: Array of 3-5 key features/modules (e.g., "Dashboard", "Reports", "User Management")
- subdomain: Suggested subdomain (lowercase, hyphenated)

Return ONLY valid JSON, no markdown or explanations.`;

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini-2025-08-07",
        messages: [
          {
            role: "system",
            content: "You are an AI that generates web application configurations. Always respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_completion_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const generatedText = aiData.choices?.[0]?.message?.content || "{}";
    
    // Parse JSON from response
    let appConfig: any;
    try {
      // Remove markdown code blocks if present
      const cleanedText = generatedText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      appConfig = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Failed to parse AI response:", generatedText);
      // Fallback config
      appConfig = {
        name: `${tenant.name} App`,
        description: `Custom application for ${tenant.name}`,
        suggested_capabilities: ["Dashboard", "Reports", "Settings"],
        subdomain: tenant.slug,
      };
    }

    // Create customer_app_project
    const { data: project, error: projectError } = await supabase
      .from("customer_app_projects")
      .insert({
        tenant_id: tenantId,
        name: appConfig.name || `${tenant.name} App`,
        description: appConfig.description || `Generated application for ${tenant.name}`,
        subdomain: appConfig.subdomain || tenant.slug,
        status: "draft",
        selected_capabilities: appConfig.suggested_capabilities || [],
        branding: theme?.tokens || null,
      })
      .select()
      .single();

    if (projectError) {
      console.error("Failed to create project:", projectError);
      return new Response(
        JSON.stringify({ error: "Failed to create project", details: projectError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        project,
        generated_config: appConfig,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-tenant-app:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
