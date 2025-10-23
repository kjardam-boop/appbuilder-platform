import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompanyService } from './companyService';
import { mockSupabaseClient } from '@/test/mocks/supabase';
import { mockCompany } from '@/test/utils/mockData';

describe('CompanyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCompanyById', () => {
    it('should fetch company by id', async () => {
      const company = mockCompany();
      mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.maybeSingle.mockResolvedValue({ data: company, error: null });

      const result = await CompanyService.getCompanyById('comp-1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('companies');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'comp-1');
      expect(result).toEqual(company);
    });

    it('should return null if company not found', async () => {
      mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.maybeSingle.mockResolvedValue({ data: null, error: null });

      const result = await CompanyService.getCompanyById('non-existent');

      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.maybeSingle.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });

      await expect(CompanyService.getCompanyById('comp-1')).rejects.toThrow();
    });
  });

  describe('findByOrgNumber', () => {
    it('should find company by organization number', async () => {
      const company = mockCompany({ org_number: '123456789' });
      mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.maybeSingle.mockResolvedValue({ data: company, error: null });

      const result = await CompanyService.findByOrgNumber('123456789');

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('org_number', '123456789');
      expect(result).toEqual(company);
    });

    it('should return null if org number not found', async () => {
      mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.maybeSingle.mockResolvedValue({ data: null, error: null });

      const result = await CompanyService.findByOrgNumber('999999999');

      expect(result).toBeNull();
    });
  });

  describe('getSavedCompanies', () => {
    it('should fetch all saved companies', async () => {
      const companies = [mockCompany({ is_saved: true })];
      mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.order.mockResolvedValue({ data: companies, error: null });

      const result = await CompanyService.getSavedCompanies();

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('is_saved', true);
      expect(result).toEqual(companies);
    });
  });

  describe('updateCRMStatus', () => {
    it('should update company CRM status', async () => {
      mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.update.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.eq.mockResolvedValue({ error: null });

      await CompanyService.updateCRMStatus('comp-1', 'customer', '2025-01-01');

      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        crm_status: 'customer',
        customer_since: '2025-01-01'
      });
    });
  });
});
