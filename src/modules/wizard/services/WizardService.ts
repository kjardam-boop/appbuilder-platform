/**
 * Wizard Service
 * 
 * Business logic for the App Creation Wizard.
 * Handles data fetching, project management, and workflow orchestration.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  WizardState,
  CreateProjectPayload,
  UpdateProjectPayload,
  ExternalSystemOption,
  PartnerOption,
  CustomerCompanyOption,
  WorkshopStatus,
} from '../types/wizard.types';

export class WizardService {
  // ===========================================================================
  // PROJECT MANAGEMENT
  // ===========================================================================

  /**
   * Load existing project data
   */
  static async loadProject(projectId: string): Promise<Partial<WizardState> | null> {
    const { data, error } = await supabase
      .from('customer_app_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error || !data) {
      console.error('Failed to load project:', error);
      return null;
    }

    // Cast to any for new columns not in TypeScript types yet
    const project = data as any;

    return {
      projectId: project.id,
      projectName: project.name || '',
      projectDescription: project.description || '',
      companyId: project.company_id || null,
      workshopStatus: project.workshop_status || 'not_started',
      miroUrl: project.miro_board_url || null,
      notionUrl: project.notion_page_url || null,
    };
  }

  /**
   * Create a new project
   */
  static async createProject(payload: CreateProjectPayload): Promise<{ id: string } | null> {
    const { data, error } = await supabase
      .from('customer_app_projects')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create project:', error);
      throw new Error(`Failed to create project: ${error.message}`);
    }

    return data;
  }

  /**
   * Update existing project
   */
  static async updateProject(payload: UpdateProjectPayload): Promise<void> {
    const { id, ...updates } = payload;
    
    const { error } = await supabase
      .from('customer_app_projects')
      .update(updates as any) // Cast for new columns
      .eq('id', id);

    if (error) {
      console.error('Failed to update project:', error);
      throw new Error(`Failed to update project: ${error.message}`);
    }
  }

  /**
   * Update workshop status
   */
  static async updateWorkshopStatus(projectId: string, status: WorkshopStatus): Promise<void> {
    const { error } = await supabase
      .from('customer_app_projects')
      .update({ workshop_status: status } as any)
      .eq('id', projectId);

    if (error) {
      console.error('Failed to update workshop status:', error);
      throw new Error(`Failed to update status: ${error.message}`);
    }
  }

  // ===========================================================================
  // PROJECT SYSTEMS
  // ===========================================================================

  /**
   * Save systems to project
   */
  static async saveProjectSystems(projectId: string, systemIds: string[]): Promise<void> {
    try {
      // Delete existing
      await supabase
        .from('project_systems' as any)
        .delete()
        .eq('project_id', projectId);

      // Insert new
      if (systemIds.length > 0) {
        const { error } = await supabase
          .from('project_systems' as any)
          .insert(systemIds.map(id => ({
            project_id: projectId,
            external_system_id: id,
          })));

        if (error) throw error;
      }
    } catch (e) {
      console.warn('project_systems table may not exist:', e);
    }
  }

  /**
   * Load project systems
   */
  static async loadProjectSystems(projectId: string): Promise<{ id: string; name: string; type: string }[]> {
    try {
      const { data } = await supabase
        .from('project_systems' as any)
        .select('*, external_system:external_systems(*)')
        .eq('project_id', projectId);

      if (!data) return [];

      return (data as any[]).map(s => ({
        id: s.external_system_id || s.id,
        name: s.external_system?.name || s.custom_system_name || 'Unknown',
        type: s.external_system?.system_types?.[0] || s.custom_system_type || 'System',
      })).filter(s => s.id);
    } catch (e) {
      console.warn('project_systems table may not exist:', e);
      return [];
    }
  }

  // ===========================================================================
  // PROJECT QUESTIONNAIRE
  // ===========================================================================

  /**
   * Load project questionnaire (questions and answers)
   */
  static async loadProjectQuestionnaire(projectId: string): Promise<{
    questions: Array<{ key: string; question: string; category: string }>;
    answers: Record<string, string>;
  }> {
    try {
      const { data, error } = await supabase
        .from('project_questionnaire_responses')
        .select('question_key, question_text, answer, category, sort_order')
        .eq('project_id', projectId)
        .order('sort_order');

      if (error) {
        console.error('Failed to load questionnaire:', error);
        return { questions: [], answers: {} };
      }

      const questions: Array<{ key: string; question: string; category: string }> = [];
      const answers: Record<string, string> = {};

      (data || []).forEach((row: any) => {
        if (row.question_key) {
          questions.push({
            key: row.question_key,
            question: row.question_text || row.question_key,
            category: row.category || 'general',
          });
          if (row.answer) {
            answers[row.question_key] = row.answer;
          }
        }
      });

      return { questions, answers };
    } catch (e) {
      console.error('Error loading questionnaire:', e);
      return { questions: [], answers: {} };
    }
  }

  /**
   * Save questionnaire answer
   */
  static async saveQuestionnaireAnswer(
    projectId: string,
    questionKey: string,
    questionText: string,
    answer: string,
    category: string = 'general'
  ): Promise<void> {
    const { error } = await supabase
      .from('project_questionnaire_responses')
      .upsert({
        project_id: projectId,
        question_key: questionKey,
        question_text: questionText,
        answer,
        category,
      }, {
        onConflict: 'project_id,question_key',
      });

    if (error) {
      console.error('Failed to save answer:', error);
      throw error;
    }
  }

  // ===========================================================================
  // PROJECT PARTNERS
  // ===========================================================================

  /**
   * Load project implementation partners
   */
  static async loadProjectPartners(projectId: string): Promise<{ id: string; name: string }[]> {
    try {
      const { data, error } = await supabase
        .from('project_implementation_partners')
        .select('company_id, companies(id, name)')
        .eq('project_id', projectId);

      if (error) {
        console.error('Failed to load partners:', error);
        return [];
      }

      return (data || []).map((p: any) => ({
        id: p.company_id,
        name: p.companies?.name || 'Unknown Partner',
      })).filter(p => p.id);
    } catch (e) {
      console.error('Error loading partners:', e);
      return [];
    }
  }

  /**
   * Save project partners
   */
  static async saveProjectPartners(projectId: string, partnerIds: string[]): Promise<void> {
    try {
      // Delete existing
      await supabase
        .from('project_implementation_partners')
        .delete()
        .eq('project_id', projectId);

      // Insert new
      if (partnerIds.length > 0) {
        const { error } = await supabase
          .from('project_implementation_partners')
          .insert(partnerIds.map(id => ({
            project_id: projectId,
            company_id: id,
          })));

        if (error) throw error;
      }
    } catch (e) {
      console.error('Failed to save partners:', e);
    }
  }

  // ===========================================================================
  // PROJECT CAPABILITIES
  // ===========================================================================

  /**
   * Load project capabilities
   */
  static async loadProjectCapabilities(projectId: string): Promise<Array<{
    id: string;
    key: string;
    name: string;
    category: string;
  }>> {
    try {
      const { data, error } = await supabase
        .from('app_capability_usage')
        .select('capability_id, capabilities(id, key, name, category)')
        .eq('project_id', projectId);

      if (error) {
        console.error('Failed to load capabilities:', error);
        return [];
      }

      return (data || []).map((c: any) => ({
        id: c.capability_id,
        key: c.capabilities?.key || 'unknown',
        name: c.capabilities?.name || 'Unknown',
        category: c.capabilities?.category || 'Unknown',
      })).filter(c => c.id);
    } catch (e) {
      console.error('Error loading capabilities:', e);
      return [];
    }
  }

  // ===========================================================================
  // FULL PROJECT LOADING
  // ===========================================================================

  /**
   * Load full project with all related data in parallel
   * This is the main method to use for loading a project
   */
  static async loadFullProject(projectId: string): Promise<WizardState | null> {
    // Load project base data first
    const projectData = await this.loadProject(projectId);
    if (!projectData) {
      return null;
    }

    // Load all related data in parallel
    const [systems, questionnaire, partners, capabilities] = await Promise.all([
      this.loadProjectSystems(projectId),
      this.loadProjectQuestionnaire(projectId),
      this.loadProjectPartners(projectId),
      this.loadProjectCapabilities(projectId),
    ]);

    // Determine step based on workshop status
    let step = 1;
    const workshopStatus = projectData.workshopStatus || 'not_started';
    if (workshopStatus === 'processed') {
      step = 5;
    } else if (['complete', 'in_progress', 'board_ready'].includes(workshopStatus)) {
      step = 3;
    } else if (projectData.companyId) {
      step = 2;
    }

    return {
      step,
      highestStepReached: step,
      projectId,
      projectName: projectData.projectName || '',
      projectDescription: projectData.projectDescription || '',
      companyId: projectData.companyId || null,
      systems,
      partners,
      questionnaire: questionnaire.answers,
      questions: questionnaire.questions,
      workshopStatus,
      miroUrl: projectData.miroUrl || null,
      notionUrl: projectData.notionUrl || null,
      generatedConfig: null,
      selectedCapabilities: capabilities,
    };
  }

  // ===========================================================================
  // DATA FETCHING - COMPANIES
  // ===========================================================================

  /**
   * Get companies filtered by role (customer, prospect)
   */
  static async getCustomerCompanies(): Promise<CustomerCompanyOption[]> {
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, org_number, industry_description, company_roles')
      .order('name');

    if (error) {
      console.error('Failed to fetch companies:', error);
      throw error;
    }

    // Filter to customers and prospects
    return (data || []).filter(c => 
      c.company_roles?.includes('customer') || c.company_roles?.includes('prospect')
    ) as CustomerCompanyOption[];
  }

  /**
   * Get implementation partners
   */
  static async getPartners(): Promise<PartnerOption[]> {
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, industry_description')
      .contains('company_roles', ['partner'])
      .order('name');

    if (error) {
      console.error('Failed to fetch partners:', error);
      throw error;
    }

    return data as PartnerOption[];
  }

  // ===========================================================================
  // DATA FETCHING - EXTERNAL SYSTEMS
  // ===========================================================================

  /**
   * Get all external systems for selection
   */
  static async getExternalSystems(): Promise<ExternalSystemOption[]> {
    const { data, error } = await supabase
      .from('external_systems')
      .select('id, name, slug, system_types, description')
      .order('name');

    if (error) {
      console.error('Failed to fetch external systems:', error);
      throw error;
    }

    return (data || []).map(s => ({
      id: s.id,
      name: s.name || 'Unnamed System',
      systemType: s.system_types?.[0] || s.slug || 'System',
      vendor: null,
      description: s.description || undefined,
    }));
  }

  // ===========================================================================
  // WORKFLOW ORCHESTRATION
  // ===========================================================================

  /**
   * Trigger Miro board creation workflow
   */
  static async triggerMiroBoardCreation(
    projectId: string,
    projectName: string,
    companyName: string,
    systems: string[],
    discoveryAnswers: Record<string, string>,
    tenantId: string
  ): Promise<{ boardUrl: string; boardId: string } | null> {
    const { data, error } = await supabase.functions.invoke('trigger-n8n-workflow', {
      body: {
        workflowKey: 'prepare-miro-workshop',
        action: 'create_board',
        input: {
          project_id: projectId,
          project_name: projectName,
          company_name: companyName,
          systems,
          discovery_answers: discoveryAnswers,
        },
        tenantId,
      },
    });

    if (error) throw error;

    if (data?.data?.board_url) {
      // Update project with Miro details
      await this.updateProject({
        id: projectId,
        miro_board_url: data.data.board_url,
        miro_board_id: data.data.board_id,
        workshop_status: 'board_ready',
      } as any);

      return {
        boardUrl: data.data.board_url,
        boardId: data.data.board_id,
      };
    }

    return null;
  }

  /**
   * Process workshop results and create Notion documentation
   */
  static async processWorkshopResults(
    projectId: string,
    tenantId: string
  ): Promise<{ notionUrl: string } | null> {
    const { data, error } = await supabase.functions.invoke('trigger-n8n-workflow', {
      body: {
        workflowKey: 'process-workshop-results',
        action: 'process',
        input: { project_id: projectId },
        tenantId,
      },
    });

    if (error) throw error;

    if (data?.data?.notion_url) {
      // Update project with Notion details
      await this.updateProject({
        id: projectId,
        notion_page_url: data.data.notion_url,
        workshop_status: 'processed',
      } as any);

      return { notionUrl: data.data.notion_url };
    }

    return null;
  }

  // ===========================================================================
  // AI QUESTION GENERATION
  // ===========================================================================

  /**
   * Generate discovery questions using AI
   */
  static async generateDiscoveryQuestions(
    companyId: string,
    systems: string[]
  ): Promise<Array<{ key: string; text: string }>> {
    const { data, error } = await supabase.functions.invoke('generate-company-questions', {
      body: {
        companyId,
        systems,
        context: 'app_creation_discovery',
      },
    });

    if (error) throw error;

    if (data?.questions) {
      return data.questions.map((q: string, i: number) => ({
        key: `q${i}`,
        text: q,
      }));
    }

    // Fallback questions
    return [
      { key: 'q0', text: 'Hva er de viktigste forretningsprosessene som skal støttes?' },
      { key: 'q1', text: 'Hvilke integrasjoner er kritiske for daglig drift?' },
      { key: 'q2', text: 'Hva er de største utfordringene med dagens løsninger?' },
      { key: 'q3', text: 'Hvilke rapporter og dashboards trenger dere?' },
      { key: 'q4', text: 'Hvordan skal brukere autentiseres?' },
    ];
  }
}

