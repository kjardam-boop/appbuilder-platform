/**
 * Wizard Module Types
 * 
 * Type definitions for the App Creation Wizard
 */

import { z } from 'zod';
import { LucideIcon } from 'lucide-react';

// =============================================================================
// WIZARD STATE & STEPS
// =============================================================================

export const WorkshopStatusValues = [
  'not_started',
  'preparing', 
  'board_ready', 
  'in_progress', 
  'complete', 
  'processed'
] as const;

export type WorkshopStatus = typeof WorkshopStatusValues[number];

export const WORKSHOP_STATUS_LABELS: Record<WorkshopStatus, string> = {
  not_started: 'Ikke startet',
  preparing: 'Forbereder...',
  board_ready: 'Board klar',
  in_progress: 'Pågår',
  complete: 'Fullført',
  processed: 'Behandlet',
};

// Selected system in wizard
export interface SelectedSystem {
  id: string;
  name: string;
  type: string;
}

// Selected partner in wizard  
export interface SelectedPartner {
  id: string;
  name: string;
}

// Discovery question definition
export interface DiscoveryQuestion {
  key: string;
  question: string;
  category: string;
  suggestedAnswer?: string;
  context?: string;
}

// Selected capability
export interface SelectedCapability {
  id: string;
  key: string;
  name: string;
  category: string;
  variant?: string;
  config?: Record<string, unknown>;
}

// Main wizard state
export interface WizardState {
  step: number;
  highestStepReached: number;
  projectId: string | null;
  projectName: string;
  projectDescription: string;
  companyId: string | null;
  systems: SelectedSystem[];
  partners: SelectedPartner[];
  questionnaire: Record<string, string>;
  questions?: DiscoveryQuestion[];
  workshopStatus: WorkshopStatus;
  miroUrl: string | null;
  notionUrl: string | null;
  generatedConfig: unknown | null;
  selectedCapabilities: SelectedCapability[];
}

// Step definition (for progress indicator)
export interface WizardStepDefinition {
  key: string;
  label: string;
  icon: LucideIcon;
  description?: string;
}

// =============================================================================
// COMMON STEP COMPONENT PROPS
// =============================================================================

/**
 * Common props interface for all wizard step components.
 * Uses a consistent pattern: state + onStateChange + tenantId
 */
export interface BaseStepProps {
  /** Current wizard state (read-only, use onStateChange to update) */
  state: WizardState;
  /** Callback to update wizard state */
  onStateChange: (updates: Partial<WizardState>) => void;
  /** Current tenant ID */
  tenantId: string;
}

// =============================================================================
// ZOD SCHEMAS FOR VALIDATION
// =============================================================================

export const ProjectDetailsSchema = z.object({
  projectName: z.string().min(3, 'Prosjektnavn må være minst 3 tegn'),
  projectDescription: z.string().optional(),
  companyId: z.string().uuid('Velg et selskap'),
});

export const SystemsSchema = z.object({
  systems: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    type: z.string(),
  })).min(0), // Optional but validated structure
});

export const PartnersSchema = z.object({
  partners: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
  })),
});

export const QuestionnaireSchema = z.record(z.string(), z.string());

// Combined schema for step 1
export const Step1Schema = ProjectDetailsSchema.merge(SystemsSchema).merge(PartnersSchema);

// =============================================================================
// API TYPES
// =============================================================================

export interface CreateProjectPayload {
  tenant_id: string;
  name: string;
  description?: string;
  company_id: string;
  workshop_status?: WorkshopStatus;
}

export interface UpdateProjectPayload extends Partial<CreateProjectPayload> {
  id: string;
  miro_board_url?: string;
  miro_board_id?: string;
  notion_page_url?: string;
  notion_page_id?: string;
}

export interface ProjectSystemPayload {
  project_id: string;
  external_system_id: string;
}

// =============================================================================
// EXTERNAL SYSTEM TYPE (for wizard)
// =============================================================================

export interface ExternalSystemOption {
  id: string;
  name: string;
  systemType: string;
  vendor: string | null;
  description?: string;
}

// =============================================================================
// IMPLEMENTATION PARTNER TYPE (for wizard)
// =============================================================================

export interface PartnerOption {
  id: string;
  name: string;
  industry_description: string | null;
}

// =============================================================================
// CUSTOMER COMPANY TYPE (for wizard)
// =============================================================================

export interface CustomerCompanyOption {
  id: string;
  name: string;
  org_number: string | null;
  industry_description: string | null;
  company_roles: string[];
}

