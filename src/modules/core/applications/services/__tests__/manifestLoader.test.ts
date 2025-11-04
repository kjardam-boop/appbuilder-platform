/**
 * ManifestLoader Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManifestLoader } from '../manifestLoader';
import type { AppManifest } from '../../types/manifest.types';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('ManifestLoader', () => {
  describe('validateManifest', () => {
    it('should validate a correct manifest', async () => {
      const validManifest: AppManifest = {
        key: 'test-app',
        name: 'Test App',
        version: '1.0.0',
        domain_tables: ['test_table'],
        shared_tables: [],
        hooks: [{ key: 'onTest', type: 'event' }],
        ui_components: [{ key: 'TestComponent', path: '/test', type: 'page' }],
        capabilities: ['testing'],
        integration_requirements: { requires_email: false },
      };

      // Mock table existence check
      const { supabase } = await import('@/integrations/supabase/client');
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      const result = await ManifestLoader.validateManifest(validManifest);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject manifest with invalid key format', async () => {
      const invalidManifest = {
        key: 'Test_App!',
        name: 'Test App',
        version: '1.0.0',
        domain_tables: ['test_table'],
      } as AppManifest;

      const result = await ManifestLoader.validateManifest(invalidManifest);
      expect(result.ok).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject manifest with invalid version format', async () => {
      const invalidManifest = {
        key: 'test-app',
        name: 'Test App',
        version: 'v1.0',
        domain_tables: ['test_table'],
      } as AppManifest;

      const result = await ManifestLoader.validateManifest(invalidManifest);
      expect(result.ok).toBe(false);
      expect(result.errors.some(e => e.includes('version'))).toBe(true);
    });

    it('should reject manifest with non-existent domain tables', async () => {
      const manifest: AppManifest = {
        key: 'test-app',
        name: 'Test App',
        version: '1.0.0',
        domain_tables: ['nonexistent_table'],
      };

      // Mock table not found
      const { supabase } = await import('@/integrations/supabase/client');
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ 
            data: null, 
            error: { code: 'PGRST204', message: 'Table not found' } 
          }),
        }),
      });

      const result = await ManifestLoader.validateManifest(manifest);
      expect(result.ok).toBe(false);
      expect(result.errors.some(e => e.includes('nonexistent_table'))).toBe(true);
    });
  });

  describe('checkMigrationNeeded', () => {
    it('should detect when domain_tables have changed', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Mock current install with old tables
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'applications') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      app_definition: {
                        domain_tables: ['old_table_1', 'old_table_2']
                      }
                    }
                  })
                })
              })
            })
          };
        }
        
        // Mock app_definitions with new tables
        if (table === 'app_definitions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    domain_tables: ['new_table_1', 'new_table_2', 'new_table_3']
                  }
                })
              })
            })
          };
        }
      });

      const needsMigration = await ManifestLoader.checkMigrationNeeded(
        'tenant-123',
        'test-app',
        '2.0.0'
      );

      expect(needsMigration).toBe(true);
    });

    it('should return false when domain_tables are unchanged', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const sameTables = ['table_1', 'table_2'];
      
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'applications') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      app_definition: {
                        domain_tables: sameTables
                      }
                    }
                  })
                })
              })
            })
          };
        }
        
        if (table === 'app_definitions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    domain_tables: sameTables
                  }
                })
              })
            })
          };
        }
      });

      const needsMigration = await ManifestLoader.checkMigrationNeeded(
        'tenant-123',
        'test-app',
        '1.1.0'
      );

      expect(needsMigration).toBe(false);
    });
  });

  describe('registerFromManifest', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should create new app definition from manifest', async () => {
      const manifest: AppManifest = {
        key: 'new-app',
        name: 'New App',
        version: '1.0.0',
        domain_tables: ['test_table'],
      };

      const { supabase } = await import('@/integrations/supabase/client');
      
      // Mock validation (table exists)
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'test_table') {
          return {
            select: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        
        // Check if app exists (doesn't)
        if (table === 'app_definitions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'new-id', key: 'new-app', name: 'New App' },
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      const result = await ManifestLoader.registerFromManifest(manifest);
      expect(result).toBeDefined();
      expect(result.key).toBe('new-app');
    });

    it('should update existing app definition', async () => {
      const manifest: AppManifest = {
        key: 'existing-app',
        name: 'Updated App',
        version: '2.0.0',
        domain_tables: ['test_table'],
      };

      const { supabase } = await import('@/integrations/supabase/client');
      
      const existingApp = { id: 'existing-id', key: 'existing-app' };
      
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'test_table') {
          return {
            select: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        
        if (table === 'app_definitions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: existingApp }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
      });

      const result = await ManifestLoader.registerFromManifest(manifest);
      expect(result).toEqual(existingApp);
    });
  });
});
