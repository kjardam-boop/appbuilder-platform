/**
 * Brreg Adapter
 * Handles all communication with Brønnøysundregistrene
 */

import { BaseAdapter } from '../base/BaseAdapter';
import { BrregConfig, BrregCompanyData, BrregSearchResult } from './types';
import { IntegrationResponse, IntegrationCallOptions } from '../../types/integration.types';
import { supabase } from '@/integrations/supabase/client';

export class BrregAdapter extends BaseAdapter<BrregConfig, BrregCompanyData> {
  name = 'brreg';

  constructor() {
    super({
      name: 'brreg',
      baseUrl: 'https://data.brreg.no/enhetsregisteret/api',
      timeout: 10000,
      retries: 3,
    });
  }

  /**
   * Make API call to Brreg
   * Note: This does NOT automatically save to database
   */
  async call<T = BrregCompanyData>(
    endpoint: string,
    options?: IntegrationCallOptions
  ): Promise<IntegrationResponse<T>> {
    try {
      this.log('info', `Calling endpoint: ${endpoint}`, options?.params);

      // Use edge function for Brreg calls to maintain existing functionality
      const { data, error } = await supabase.functions.invoke('brreg-lookup', {
        body: {
          endpoint,
          ...options?.params,
        },
      });

      if (error) {
        this.log('error', 'Brreg API error', error);
        return {
          success: false,
          error: error.message,
          metadata: {
            timestamp: new Date().toISOString(),
            source: this.name,
          },
        };
      }

      this.log('info', 'Brreg API success', { dataSize: JSON.stringify(data).length });

      return {
        success: true,
        data: data as T,
        metadata: {
          timestamp: new Date().toISOString(),
          source: this.name,
        },
      };
    } catch (error: any) {
      this.log('error', 'Unexpected error', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
        metadata: {
          timestamp: new Date().toISOString(),
          source: this.name,
        },
      };
    }
  }

  /**
   * Check if company should be synced
   * Only sync if company is saved or has roles/relations
   */
  async shouldSync(companyId: string): Promise<boolean> {
    try {
      const { data: company } = await supabase
        .from('companies')
        .select('is_saved')
        .eq('id', companyId)
        .maybeSingle();

      if (!company) return false;

      // Sync only if company is explicitly saved
      return company.is_saved === true;
    } catch (error) {
      this.log('error', 'Error checking sync status', error);
      return false;
    }
  }

  /**
   * Sync Brreg data to database
   * Only called for companies that are explicitly saved
   */
  async syncToDatabase(data: BrregCompanyData): Promise<void> {
    try {
      const orgNumber = data.organisasjonsnummer;

      // Check if company exists and should be synced
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id, is_saved')
        .eq('org_number', orgNumber)
        .maybeSingle();

      if (!existingCompany) {
        this.log('info', `Company ${orgNumber} not in database, skipping sync`);
        return;
      }

      // Only sync if company is explicitly saved
      if (!existingCompany.is_saved) {
        this.log('info', `Company ${orgNumber} not marked for sync, skipping`);
        return;
      }

      this.log('info', `Syncing company ${orgNumber} to database`);

      // Update company data
      const { error } = await supabase
        .from('companies')
        .update({
          name: data.navn,
          org_form: data.organisasjonsform?.beskrivelse,
          industry_code: data.naeringskode1?.kode,
          industry_description: data.naeringskode1?.beskrivelse,
          employees: data.antallAnsatte,
          founding_date: data.stiftelsesdato,
          website: data.hjemmeside,
          last_fetched_at: new Date().toISOString(),
        })
        .eq('org_number', orgNumber);

      if (error) {
        this.log('error', 'Error updating company', error);
        throw error;
      }

      // Update sync status
      await this.updateSyncStatus(existingCompany.id, 'success');

      this.log('info', `Successfully synced company ${orgNumber}`);
    } catch (error: any) {
      this.log('error', 'Error syncing to database', error);
      throw error;
    }
  }

  /**
   * Update integration sync status
   */
  private async updateSyncStatus(
    companyId: string,
    status: 'success' | 'error',
    error?: string
  ): Promise<void> {
    try {
      const now = new Date();
      const nextSync = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await supabase.from('integration_sync_status').upsert({
        integration_name: this.name,
        entity_type: 'company',
        entity_id: companyId,
        last_synced_at: now.toISOString(),
        next_sync_at: nextSync.toISOString(),
        status,
        error: error || null,
      });
    } catch (err) {
      this.log('error', 'Error updating sync status', err);
    }
  }

  /**
   * Search companies in Brreg
   * Note: Does NOT save to database automatically
   */
  async searchCompanies(query: string): Promise<BrregSearchResult[]> {
    const response = await this.call<{ _embedded?: { enheter: BrregCompanyData[] } }>('/enheter', {
      params: { navn: query },
    });

    if (!response.success || !response.data?._embedded?.enheter) {
      return [];
    }

    return response.data._embedded.enheter.map((company) => ({
      orgNumber: company.organisasjonsnummer,
      name: company.navn,
      orgForm: company.organisasjonsform?.beskrivelse,
      industryCode: company.naeringskode1?.kode,
      industryDescription: company.naeringskode1?.beskrivelse,
      employees: company.antallAnsatte,
      foundingDate: company.stiftelsesdato,
      website: company.hjemmeside,
    }));
  }

  /**
   * Get company details by org number
   * Note: Does NOT save to database automatically
   */
  async getCompanyDetails(orgNumber: string): Promise<BrregCompanyData | null> {
    const response = await this.call<BrregCompanyData>(`/enheter/${orgNumber}`);

    if (!response.success || !response.data) {
      return null;
    }

    return response.data;
  }
}
