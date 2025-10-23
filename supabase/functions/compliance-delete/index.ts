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
    const { subject, anonymize = true } = await req.json();

    if (!subject) {
      throw new Error('Subject email is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Deleting/anonymizing data for subject:', subject, 'Anonymize:', anonymize);

    // Verify user is authorized (admin only for this operation)
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
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
        subject_email: subject,
        request_type: 'delete',
        requested_by: user.id,
        status: 'processing',
      })
      .select()
      .single();

    if (requestError) throw requestError;

    let deletedRecords = 0;
    let anonymizedRecords = 0;

    if (anonymize) {
      // Anonymize instead of delete (recommended for audit trail)
      const anonymizedEmail = `anonymized_${Date.now()}@deleted.local`;

      // Anonymize profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .update({
          email: anonymizedEmail,
          first_name: '[DELETED]',
          last_name: '[DELETED]',
          phone: null,
        })
        .eq('email', subject)
        .select('id');

      anonymizedRecords += profiles?.length || 0;

      // Anonymize companies
      const { data: companies } = await supabase
        .from('companies')
        .update({
          email: anonymizedEmail,
          phone: null,
        })
        .eq('email', subject)
        .select('id');

      anonymizedRecords += companies?.length || 0;

      // Audit logs are kept for compliance (but user_id is already nullable)
    } else {
      // Hard delete (use with caution!)
      const { data: profiles } = await supabase
        .from('profiles')
        .delete()
        .eq('email', subject)
        .select('id');

      deletedRecords += profiles?.length || 0;

      // Companies are not deleted, only anonymized
      const { data: companies } = await supabase
        .from('companies')
        .update({
          email: `deleted_${Date.now()}@deleted.local`,
          phone: null,
        })
        .eq('email', subject)
        .select('id');

      anonymizedRecords += companies?.length || 0;
    }

    // Update request status
    await supabase
      .from('data_subject_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result_data: {
          deleted_records: deletedRecords,
          anonymized_records: anonymizedRecords,
        },
      })
      .eq('id', request.id);

    return new Response(
      JSON.stringify({
        success: true,
        deleted_records: deletedRecords,
        anonymized_records: anonymizedRecords,
        message: anonymize 
          ? 'Data anonymized successfully'
          : 'Data deleted successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error deleting data:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
