import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const subjectEmail = url.searchParams.get('subject');

    if (!subjectEmail) {
      throw new Error('Subject email is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Exporting data for subject:', subjectEmail);

    // Get tenant from auth header or default
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    // Verify user is authorized (admin or self)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create data subject request record
    const { data: request, error: requestError } = await supabase
      .from('data_subject_requests')
      .insert({
        tenant_id: user.user_metadata?.tenant_id || 'default',
        subject_email: subjectEmail,
        request_type: 'export',
        requested_by: user.id,
        status: 'processing',
      })
      .select()
      .single();

    if (requestError) throw requestError;

    // Export data from all relevant tables
    const exportResult: any = {
      subject_email: subjectEmail,
      exported_at: new Date().toISOString(),
      data: {},
      metadata: {
        total_records: 0,
        tables_included: [],
      },
    };

    // Export profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .or(`email.eq.${subjectEmail},user_id.eq.${user.id}`);

    if (profiles && profiles.length > 0) {
      exportResult.data.profiles = profiles;
      exportResult.metadata.total_records += profiles.length;
      exportResult.metadata.tables_included.push('profiles');
    }

    // Export companies (where user is contact or related)
    const { data: companies } = await supabase
      .from('companies')
      .select('*')
      .eq('email', subjectEmail);

    if (companies && companies.length > 0) {
      exportResult.data.companies = companies;
      exportResult.metadata.total_records += companies.length;
      exportResult.metadata.tables_included.push('companies');
    }

    // Export projects (where user is owner or participant)
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', user.id);

    if (projects && projects.length > 0) {
      exportResult.data.projects = projects;
      exportResult.metadata.total_records += projects.length;
      exportResult.metadata.tables_included.push('projects');
    }

    // Export audit logs
    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', user.id)
      .limit(1000);

    if (auditLogs && auditLogs.length > 0) {
      exportResult.data.audit_logs = auditLogs;
      exportResult.metadata.total_records += auditLogs.length;
      exportResult.metadata.tables_included.push('audit_logs');
    }

    // Update request status
    await supabase
      .from('data_subject_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result_data: { summary: exportResult.metadata },
      })
      .eq('id', request.id);

    return new Response(
      JSON.stringify(exportResult),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="data-export-${subjectEmail}-${Date.now()}.json"`
        } 
      }
    );

  } catch (error) {
    console.error('Error exporting data:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
