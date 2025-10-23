import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BrregWebhookPayload {
  organisasjonsnummer: string;
  changeType: 'update' | 'delete';
  timestamp: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[webhooks-brreg] Received webhook request');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse webhook payload
    const payload: BrregWebhookPayload = await req.json();
    console.log('[webhooks-brreg] Payload:', payload);

    // Validate payload
    if (!payload.organisasjonsnummer || !payload.changeType) {
      return new Response(
        JSON.stringify({ error: 'Invalid payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log webhook
    const { data: logData, error: logError } = await supabase
      .from('webhook_logs')
      .insert({
        source: 'brreg',
        event_type: `company.${payload.changeType}`,
        payload: payload,
        processed: false,
      })
      .select('id')
      .single();

    if (logError) {
      console.error('[webhooks-brreg] Error logging webhook:', logError);
      throw logError;
    }

    const logId = logData.id;
    console.log('[webhooks-brreg] Logged webhook:', logId);

    try {
      // Check if company exists and should be synced
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id, is_saved')
        .eq('org_number', payload.organisasjonsnummer)
        .maybeSingle();

      if (companyError) {
        throw companyError;
      }

      if (!company) {
        console.log('[webhooks-brreg] Company not in database, ignoring webhook');
        await supabase
          .from('webhook_logs')
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq('id', logId);
        
        return new Response(
          JSON.stringify({ success: true, message: 'Company not tracked' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if should sync (only saved companies)
      if (!company.is_saved) {
        console.log('[webhooks-brreg] Company not marked for sync, ignoring webhook');
        await supabase
          .from('webhook_logs')
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq('id', logId);
        
        return new Response(
          JSON.stringify({ success: true, message: 'Company not marked for sync' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Process based on change type
      if (payload.changeType === 'update') {
        console.log('[webhooks-brreg] Fetching updated company data');
        
        // Fetch fresh data from Brreg
        const { data: brregData, error: brregError } = await supabase.functions.invoke('brreg-enhanced-lookup', {
          body: { orgNumber: payload.organisasjonsnummer }
        });

        if (brregError) {
          throw brregError;
        }

        if (brregData) {
          console.log('[webhooks-brreg] Updating company in database');
          
          // Update company
          const { error: updateError } = await supabase
            .from('companies')
            .update({
              name: brregData.navn,
              org_form: brregData.organisasjonsform?.beskrivelse,
              industry_code: brregData.naeringskode1?.kode,
              industry_description: brregData.naeringskode1?.beskrivelse,
              employees: brregData.antallAnsatte,
              founding_date: brregData.stiftelsesdato,
              website: brregData.hjemmeside,
              last_fetched_at: new Date().toISOString(),
            })
            .eq('org_number', payload.organisasjonsnummer);

          if (updateError) {
            throw updateError;
          }

          // Update sync status
          await supabase.from('integration_sync_status').upsert({
            integration_name: 'brreg',
            entity_type: 'company',
            entity_id: company.id,
            last_synced_at: new Date().toISOString(),
            next_sync_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'success',
          });
        }
      } else if (payload.changeType === 'delete') {
        console.log('[webhooks-brreg] Company deleted in Brreg, logging event');
        // You might want to mark the company as inactive or log this event
      }

      // Mark webhook as processed
      await supabase
        .from('webhook_logs')
        .update({ 
          processed: true, 
          processed_at: new Date().toISOString() 
        })
        .eq('id', logId);

      console.log('[webhooks-brreg] Webhook processed successfully');

      return new Response(
        JSON.stringify({ success: true, logId }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (processingError: any) {
      console.error('[webhooks-brreg] Error processing webhook:', processingError);
      
      // Mark webhook as processed with error
      await supabase
        .from('webhook_logs')
        .update({ 
          processed: true, 
          processed_at: new Date().toISOString(),
          error: processingError.message 
        })
        .eq('id', logId);

      throw processingError;
    }

  } catch (error: any) {
    console.error('[webhooks-brreg] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
