import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestConnectionRequest {
  companyId: string;
  externalSystemId: string;
  credentials: Record<string, string>;
  config?: Record<string, any>;
}

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
  responseTime?: number;
}

/**
 * Test connection for different system types
 */
async function testConnection(
  systemSlug: string,
  credentials: Record<string, string>,
  config: Record<string, any>
): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Map system slugs to their test logic
    switch (systemSlug) {
      case "hubspot-crm":
        return await testHubSpot(credentials, startTime);
      
      case "tripletex-erp":
        return await testTripletex(credentials, startTime);
      
      case "xledger-erp":
        return await testXledger(credentials, startTime);
      
      case "poweroffice-erp":
        return await testPowerOffice(credentials, startTime);
      
      case "24sevenoffice-erp":
        return await test24SevenOffice(credentials, startTime);
      
      case "visma-net-erp":
        return await testVismaNet(credentials, startTime);
      
      default:
        return await testGenericAPI(credentials, config, startTime);
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Test failed: ${error.message}`,
      details: error.toString(),
      responseTime: Date.now() - startTime,
    };
  }
}

async function testHubSpot(credentials: Record<string, string>, startTime: number): Promise<TestResult> {
  const apiKey = credentials.api_key || credentials.API_KEY;
  if (!apiKey) {
    return { success: false, message: "Missing API key" };
  }

  const response = await fetch("https://api.hubapi.com/crm/v3/objects/contacts?limit=1", {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  const responseTime = Date.now() - startTime;

  if (response.ok) {
    return {
      success: true,
      message: "Successfully connected to HubSpot API",
      responseTime,
    };
  } else {
    const error = await response.text();
    return {
      success: false,
      message: `HubSpot API error: ${response.status} ${response.statusText}`,
      details: error,
      responseTime,
    };
  }
}

async function testTripletex(credentials: Record<string, string>, startTime: number): Promise<TestResult> {
  const sessionToken = credentials.session_token || credentials.SESSION_TOKEN;
  const employeeToken = credentials.employee_token || credentials.EMPLOYEE_TOKEN;
  
  if (!sessionToken || !employeeToken) {
    return { success: false, message: "Missing session token or employee token" };
  }

  const response = await fetch("https://api.tripletex.io/v2/company", {
    headers: {
      "Authorization": `Basic ${btoa(`0:${sessionToken}:${employeeToken}`)}`,
      "Content-Type": "application/json",
    },
  });

  const responseTime = Date.now() - startTime;

  if (response.ok) {
    const data = await response.json();
    return {
      success: true,
      message: `Successfully connected to Tripletex API`,
      details: { company: data.value?.name },
      responseTime,
    };
  } else {
    return {
      success: false,
      message: `Tripletex API error: ${response.status} ${response.statusText}`,
      responseTime,
    };
  }
}

async function testXledger(credentials: Record<string, string>, startTime: number): Promise<TestResult> {
  const apiKey = credentials.api_key || credentials.API_KEY;
  const dbName = credentials.database_name || credentials.DATABASE_NAME;
  
  if (!apiKey || !dbName) {
    return { success: false, message: "Missing API key or database name" };
  }

  const response = await fetch(`https://api.xledger.net/v1/${dbName}/Account`, {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  const responseTime = Date.now() - startTime;

  if (response.ok) {
    return {
      success: true,
      message: "Successfully connected to Xledger API",
      responseTime,
    };
  } else {
    return {
      success: false,
      message: `Xledger API error: ${response.status} ${response.statusText}`,
      responseTime,
    };
  }
}

async function testPowerOffice(credentials: Record<string, string>, startTime: number): Promise<TestResult> {
  const clientKey = credentials.client_key || credentials.CLIENT_KEY;
  
  if (!clientKey) {
    return { success: false, message: "Missing client key" };
  }

  const response = await fetch("https://api.poweroffice.net/v2/Clients", {
    headers: {
      "Authorization": `Bearer ${clientKey}`,
      "Content-Type": "application/json",
    },
  });

  const responseTime = Date.now() - startTime;

  if (response.ok) {
    return {
      success: true,
      message: "Successfully connected to PowerOffice API",
      responseTime,
    };
  } else {
    return {
      success: false,
      message: `PowerOffice API error: ${response.status} ${response.statusText}`,
      responseTime,
    };
  }
}

async function test24SevenOffice(credentials: Record<string, string>, startTime: number): Promise<TestResult> {
  const apiKey = credentials.api_key || credentials.API_KEY;
  
  if (!apiKey) {
    return { success: false, message: "Missing API key" };
  }

  const response = await fetch("https://api.24sevenoffice.com/authenticate/identity", {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  const responseTime = Date.now() - startTime;

  if (response.ok) {
    return {
      success: true,
      message: "Successfully connected to 24SevenOffice API",
      responseTime,
    };
  } else {
    return {
      success: false,
      message: `24SevenOffice API error: ${response.status} ${response.statusText}`,
      responseTime,
    };
  }
}

async function testVismaNet(credentials: Record<string, string>, startTime: number): Promise<TestResult> {
  const token = credentials.token || credentials.TOKEN;
  
  if (!token) {
    return { success: false, message: "Missing access token" };
  }

  const response = await fetch("https://integration.visma.net/API/v1/companies", {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const responseTime = Date.now() - startTime;

  if (response.ok) {
    return {
      success: true,
      message: "Successfully connected to Visma.net API",
      responseTime,
    };
  } else {
    return {
      success: false,
      message: `Visma.net API error: ${response.status} ${response.statusText}`,
      responseTime,
    };
  }
}

async function testGenericAPI(
  credentials: Record<string, string>,
  config: Record<string, any>,
  startTime: number
): Promise<TestResult> {
  const testUrl = config.test_endpoint || config.base_url;
  const apiKey = credentials.api_key || credentials.API_KEY || credentials.token || credentials.TOKEN;
  
  if (!testUrl) {
    return {
      success: false,
      message: "No test endpoint configured. Please add test_endpoint to config or specify API details.",
    };
  }

  if (!apiKey) {
    return {
      success: false,
      message: "Missing API credentials",
    };
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Try common auth header formats
    if (config.auth_type === "bearer" || !config.auth_type) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    } else if (config.auth_type === "api_key") {
      headers["X-API-Key"] = apiKey;
    }

    const response = await fetch(testUrl, { headers });
    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        success: true,
        message: "Successfully connected to API",
        responseTime,
      };
    } else {
      return {
        success: false,
        message: `API error: ${response.status} ${response.statusText}`,
        responseTime,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Connection failed: ${error.message}`,
      responseTime: Date.now() - startTime,
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { companyId, externalSystemId, credentials, config } = await req.json() as TestConnectionRequest;

    console.log(`[Test Connection] Testing connection for company ${companyId}, system ${externalSystemId}`);

    // Fetch the external system details
    const { data: system, error: systemError } = await supabase
      .from('external_systems')
      .select('slug')
      .eq('id', externalSystemId)
      .single();

    if (systemError || !system) {
      throw new Error('External system not found');
    }

    // Test the connection
    const result = await testConnection(system.slug, credentials, config || {});

    // Log the test result
    await supabase
      .from('integration_usage_logs')
      .insert({
        tenant_id: companyId, // Using companyId as tenant for now
        adapter_id: system.slug,
        action: 'connection_test',
        request_payload: { test: true },
        response_status: result.success ? 200 : 500,
        response_time_ms: result.responseTime || 0,
        error_message: result.success ? null : result.message,
      });

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[Test Connection] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
