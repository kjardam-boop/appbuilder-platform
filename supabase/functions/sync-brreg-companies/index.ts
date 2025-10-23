import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncReport {
  processed: number;
  updated: number;
  errors: number;
  skipped: number;
  details: Array<{
    companyId: string;
    orgNumber: string;
    status: 'updated' | 'error' | 'skipped';
    message?: string;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { scheduled, companyIds } = await req.json().catch(() => ({ scheduled: false, companyIds: null }));
    
    console.log(`[sync-brreg-companies] Starting sync - Scheduled: ${scheduled}`);

    const report: SyncReport = {
      processed: 0,
      updated: 0,
      errors: 0,
      skipped: 0,
      details: []
    };

    // Fetch companies that need syncing
    let query = supabase
      .from('companies')
      .select('id, org_number, last_synced_at')
      .eq('is_saved', true);

    // If specific company IDs are provided (manual sync), filter by those
    if (companyIds && Array.isArray(companyIds)) {
      query = query.in('id', companyIds);
    } else {
      // For scheduled sync, only sync companies not synced in the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      query = query.or(`last_synced_at.is.null,last_synced_at.lt.${sevenDaysAgo.toISOString()}`);
    }

    const { data: companies, error: fetchError } = await query;

    if (fetchError) {
      console.error('[sync-brreg-companies] Error fetching companies:', fetchError);
      throw new Error(`Failed to fetch companies: ${fetchError.message}`);
    }

    if (!companies || companies.length === 0) {
      console.log('[sync-brreg-companies] No companies to sync');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No companies need syncing',
          report 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-brreg-companies] Found ${companies.length} companies to sync`);

    // Process companies in batches of 10
    const BATCH_SIZE = 10;
    const DELAY_BETWEEN_CALLS = 100; // ms

    for (let i = 0; i < companies.length; i += BATCH_SIZE) {
      const batch = companies.slice(i, i + BATCH_SIZE);
      
      for (const company of batch) {
        report.processed++;
        
        try {
          // Fetch enhanced data from Brreg
          const { data: enhancedData, error: brregError } = await supabase.functions.invoke(
            'brreg-enhanced-lookup',
            {
              body: { orgNumber: company.org_number }
            }
          );

          if (brregError) {
            console.error(`[sync-brreg-companies] Brreg error for ${company.org_number}:`, brregError);
            report.errors++;
            report.details.push({
              companyId: company.id,
              orgNumber: company.org_number,
              status: 'error',
              message: brregError.message
            });

            // Update sync status with error
            await supabase
              .from('integration_sync_status')
              .upsert({
                integration_name: 'brreg',
                entity_type: 'company',
                entity_id: company.id,
                status: 'error',
                error: brregError.message,
                last_synced_at: new Date().toISOString(),
                next_sync_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
              }, { onConflict: 'integration_name,entity_type,entity_id' });

            continue;
          }

          if (!enhancedData?.company) {
            console.warn(`[sync-brreg-companies] No data returned for ${company.org_number}`);
            report.skipped++;
            report.details.push({
              companyId: company.id,
              orgNumber: company.org_number,
              status: 'skipped',
              message: 'No data returned from Brreg'
            });
            continue;
          }

          // Update company with fresh data
          const companyData = enhancedData.company;
          const { error: updateError } = await supabase
            .from('companies')
            .update({
              name: companyData.name,
              org_form: companyData.orgForm,
              industry_code: companyData.industryCode,
              industry_description: companyData.industryDescription,
              employees: companyData.employees,
              founding_date: companyData.foundingDate,
              website: companyData.website,
              last_synced_at: new Date().toISOString(),
              last_fetched_at: new Date().toISOString()
            })
            .eq('id', company.id);

          if (updateError) {
            console.error(`[sync-brreg-companies] Update error for ${company.org_number}:`, updateError);
            report.errors++;
            report.details.push({
              companyId: company.id,
              orgNumber: company.org_number,
              status: 'error',
              message: updateError.message
            });
            continue;
          }

          // Update sync status with success
          await supabase
            .from('integration_sync_status')
            .upsert({
              integration_name: 'brreg',
              entity_type: 'company',
              entity_id: company.id,
              status: 'success',
              error: null,
              last_synced_at: new Date().toISOString(),
              next_sync_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            }, { onConflict: 'integration_name,entity_type,entity_id' });

          report.updated++;
          report.details.push({
            companyId: company.id,
            orgNumber: company.org_number,
            status: 'updated'
          });

          console.log(`[sync-brreg-companies] Successfully synced ${company.org_number}`);

          // Rate limiting delay
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CALLS));

        } catch (error) {
          console.error(`[sync-brreg-companies] Unexpected error for ${company.org_number}:`, error);
          report.errors++;
          report.details.push({
            companyId: company.id,
            orgNumber: company.org_number,
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    console.log('[sync-brreg-companies] Sync completed:', report);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sync completed: ${report.updated} updated, ${report.errors} errors, ${report.skipped} skipped`,
        report
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[sync-brreg-companies] Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
