/**
 * WizardService Unit Tests
 * 
 * Tests for the App Creation Wizard service layer.
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { WizardService } from '../../services/WizardService';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Helper to create chainable mock
const createChainableMock = (finalValue: any) => {
  const mock: any = {
    select: vi.fn(() => mock),
    insert: vi.fn(() => mock),
    update: vi.fn(() => mock),
    delete: vi.fn(() => mock),
    upsert: vi.fn(() => mock),
    eq: vi.fn(() => mock),
    single: vi.fn(() => Promise.resolve(finalValue)),
    order: vi.fn(() => Promise.resolve(finalValue)),
    contains: vi.fn(() => mock),
  };
  return mock;
};

describe('WizardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadProject', () => {
    it('should load project data successfully', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        description: 'Test description',
        company_id: 'company-456',
        workshop_status: 'not_started',
        miro_board_url: null,
        notion_page_url: null,
      };

      const chainMock = createChainableMock({ data: mockProject, error: null });
      (supabase.from as Mock).mockReturnValue(chainMock);

      const result = await WizardService.loadProject('project-123');

      expect(result).toBeDefined();
      expect(result?.projectId).toBe('project-123');
      expect(result?.projectName).toBe('Test Project');
      expect(result?.companyId).toBe('company-456');
    });

    it('should return null when project not found', async () => {
      const chainMock = createChainableMock({ data: null, error: { code: 'PGRST116' } });
      (supabase.from as Mock).mockReturnValue(chainMock);

      const result = await WizardService.loadProject('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('createProject', () => {
    it('should create project and return id', async () => {
      const chainMock = createChainableMock({ data: { id: 'new-project-123' }, error: null });
      (supabase.from as Mock).mockReturnValue(chainMock);

      const result = await WizardService.createProject({
        tenant_id: 'tenant-123',
        name: 'New Project',
        company_id: 'company-456',
      });

      expect(result).toEqual({ id: 'new-project-123' });
    });

    it('should throw error when creation fails', async () => {
      const chainMock = createChainableMock({ data: null, error: { message: 'Database error' } });
      (supabase.from as Mock).mockReturnValue(chainMock);

      await expect(
        WizardService.createProject({
          tenant_id: 'tenant-123',
          name: 'New Project',
          company_id: 'company-456',
        })
      ).rejects.toThrow('Failed to create project');
    });
  });

  describe('updateProject', () => {
    it('should update project without error', async () => {
      const chainMock = createChainableMock({ error: null });
      (supabase.from as Mock).mockReturnValue(chainMock);

      await expect(
        WizardService.updateProject({
          id: 'project-123',
          name: 'Updated Name',
        })
      ).resolves.not.toThrow();
    });

    it('should throw error when update fails', async () => {
      // Create a mock that returns an error
      const mock: any = {
        update: vi.fn(() => mock),
        eq: vi.fn(() => Promise.resolve({ error: { message: 'Update failed' } })),
      };
      (supabase.from as Mock).mockReturnValue(mock);

      await expect(
        WizardService.updateProject({
          id: 'project-123',
          name: 'Updated Name',
        })
      ).rejects.toThrow('Failed to update project');
    });
  });

  describe('loadProjectSystems', () => {
    it('should load and map project systems', async () => {
      const mockData = [
        {
          external_system_id: 'sys-1',
          external_system: {
            name: 'System 1',
            system_types: ['ERP'],
          },
        },
        {
          external_system_id: 'sys-2',
          external_system: {
            name: 'System 2',
            system_types: ['CRM'],
          },
        },
      ];

      const chainMock = {
        select: vi.fn(() => chainMock),
        eq: vi.fn(() => Promise.resolve({ data: mockData, error: null })),
      };
      (supabase.from as Mock).mockReturnValue(chainMock);

      const result = await WizardService.loadProjectSystems('project-123');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 'sys-1', name: 'System 1', type: 'ERP' });
      expect(result[1]).toEqual({ id: 'sys-2', name: 'System 2', type: 'CRM' });
    });

    it('should return empty array when no systems', async () => {
      const chainMock = {
        select: vi.fn(() => chainMock),
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      };
      (supabase.from as Mock).mockReturnValue(chainMock);

      const result = await WizardService.loadProjectSystems('project-123');

      expect(result).toEqual([]);
    });
  });

  describe('loadProjectQuestionnaire', () => {
    it('should load questions and answers', async () => {
      const mockData = [
        { question_key: 'q1', question_text: 'Question 1', answer: 'Answer 1', category: 'goals' },
        { question_key: 'q2', question_text: 'Question 2', answer: 'Answer 2', category: 'users' },
      ];

      const chainMock = {
        select: vi.fn(() => chainMock),
        eq: vi.fn(() => chainMock),
        order: vi.fn(() => Promise.resolve({ data: mockData, error: null })),
      };
      (supabase.from as Mock).mockReturnValue(chainMock);

      const result = await WizardService.loadProjectQuestionnaire('project-123');

      expect(result.questions).toHaveLength(2);
      expect(result.answers).toEqual({ q1: 'Answer 1', q2: 'Answer 2' });
    });

    it('should return empty when no questions', async () => {
      const chainMock = {
        select: vi.fn(() => chainMock),
        eq: vi.fn(() => chainMock),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      };
      (supabase.from as Mock).mockReturnValue(chainMock);

      const result = await WizardService.loadProjectQuestionnaire('project-123');

      expect(result.questions).toEqual([]);
      expect(result.answers).toEqual({});
    });
  });

  describe('saveQuestionnaireAnswer', () => {
    it('should upsert answer successfully', async () => {
      const chainMock = createChainableMock({ error: null });
      (supabase.from as Mock).mockReturnValue(chainMock);

      await expect(
        WizardService.saveQuestionnaireAnswer(
          'project-123',
          'q1',
          'What is your goal?',
          'My answer',
          'goals'
        )
      ).resolves.not.toThrow();

      expect(chainMock.upsert).toHaveBeenCalled();
    });
  });

  describe('getCustomerCompanies', () => {
    it('should filter companies by customer/prospect role', async () => {
      const mockCompanies = [
        { id: '1', name: 'Customer A', company_roles: ['customer'] },
        { id: '2', name: 'Prospect B', company_roles: ['prospect'] },
        { id: '3', name: 'Partner C', company_roles: ['partner'] },
      ];

      const chainMock = {
        select: vi.fn(() => chainMock),
        order: vi.fn(() => Promise.resolve({ data: mockCompanies, error: null })),
      };
      (supabase.from as Mock).mockReturnValue(chainMock);

      const result = await WizardService.getCustomerCompanies();

      expect(result).toHaveLength(2);
      expect(result.map(c => c.name)).toEqual(['Customer A', 'Prospect B']);
    });
  });

  describe('getPartners', () => {
    it('should return companies with partner role', async () => {
      const mockPartners = [
        { id: '1', name: 'Partner A', industry_description: 'Consulting' },
        { id: '2', name: 'Partner B', industry_description: 'Tech' },
      ];

      const chainMock = {
        select: vi.fn(() => chainMock),
        contains: vi.fn(() => chainMock),
        order: vi.fn(() => Promise.resolve({ data: mockPartners, error: null })),
      };
      (supabase.from as Mock).mockReturnValue(chainMock);

      const result = await WizardService.getPartners();

      expect(result).toHaveLength(2);
    });
  });

  describe('getExternalSystems', () => {
    it('should map external systems correctly', async () => {
      const mockSystems = [
        { id: '1', name: 'Odoo', slug: 'odoo', system_types: ['ERP'], description: 'ERP system' },
        { id: '2', name: 'HubSpot', slug: 'hubspot', system_types: ['CRM'], description: 'CRM system' },
      ];

      const chainMock = {
        select: vi.fn(() => chainMock),
        order: vi.fn(() => Promise.resolve({ data: mockSystems, error: null })),
      };
      (supabase.from as Mock).mockReturnValue(chainMock);

      const result = await WizardService.getExternalSystems();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: '1',
        name: 'Odoo',
        systemType: 'ERP',
        vendor: null,
        description: 'ERP system',
      });
    });
  });

  describe('updateWorkshopStatus', () => {
    it('should update workshop status', async () => {
      const chainMock = createChainableMock({ error: null });
      (supabase.from as Mock).mockReturnValue(chainMock);

      await expect(
        WizardService.updateWorkshopStatus('project-123', 'board_ready')
      ).resolves.not.toThrow();

      expect(chainMock.update).toHaveBeenCalled();
    });
  });
});

