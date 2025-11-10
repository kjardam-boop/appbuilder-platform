/**
 * ApplicationService External Systems Tests
 * Tests for new External Systems metadata methods
 */

import { describe, it, expect, vi } from 'vitest';
import { ApplicationService } from '../applicationService';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock context
const mockContext = {} as any;

describe('ApplicationService - External Systems', () => {
  describe('getByCapability', () => {
    it('should return products with specified capability', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const mockProducts = [
        { id: '1', name: 'Product A', capabilities: ['accounting', 'invoicing'] },
        { id: '2', name: 'Product B', capabilities: ['accounting', 'reporting'] },
      ];
      
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          contains: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockProducts, error: null }),
          }),
        }),
      });

      const result = await ApplicationService.getByCapability('accounting');
      
      expect(result).toEqual(mockProducts);
      expect(supabase.from).toHaveBeenCalledWith('external_systems');
    });

    it('should filter by Active status', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      let capturedStatus: string | undefined;
      
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          contains: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation((field, value) => {
              if (field === 'status') capturedStatus = value;
              return Promise.resolve({ data: [], error: null });
            }),
          }),
        }),
      });

      await ApplicationService.getByCapability('accounting');
      
      expect(capturedStatus).toBe('Active');
    });
  });

  describe('getByUseCase', () => {
    it('should return products with specified use case', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const mockProducts = [
        { 
          id: '1', 
          name: 'ERP System',
          use_cases: [{ key: 'financial_reporting', description: 'Financial reports' }]
        },
      ];
      
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          filter: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockProducts, error: null }),
          }),
        }),
      });

      const result = await ApplicationService.getByUseCase('financial_reporting');
      
      expect(result).toEqual(mockProducts);
    });
  });

  describe('getMcpReference', () => {
    it('should return MCP reference for product', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { mcp_reference: 'mcp://visma-net-erp/v1' },
              error: null,
            }),
          }),
        }),
      });

      const result = await ApplicationService.getMcpReference('product-123');
      
      expect(result).toBe('mcp://visma-net-erp/v1');
    });

    it('should return null when no MCP reference exists', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { mcp_reference: null },
              error: null,
            }),
          }),
        }),
      });

      const result = await ApplicationService.getMcpReference('product-123');
      
      expect(result).toBeNull();
    });
  });

  describe('getSupportedIntegrationProviders', () => {
    it('should return integration providers for product', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const providers = { n8n: true, pipedream: true, zapier: false };
      
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { integration_providers: providers },
              error: null,
            }),
          }),
        }),
      });

      const result = await ApplicationService.getSupportedIntegrationProviders('product-123');
      
      expect(result).toEqual(providers);
    });

    it('should return empty object when no providers configured', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { integration_providers: null },
              error: null,
            }),
          }),
        }),
      });

      const result = await ApplicationService.getSupportedIntegrationProviders('product-123');
      
      expect(result).toEqual({});
    });
  });
});
