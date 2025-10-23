import { BaseEntity } from "@/core/types/common.types";

export type ProjectPhase = 'malbilde' | 'anskaffelse' | 'kontraktsforhandlinger' | 'gjennomforing' | 'evaluering';

export interface Project extends BaseEntity {
  title: string;
  description: string | null;
  company_id: string | null;
  current_phase: ProjectPhase;
  requirements_summary: string | null;
  created_by: string;
}

export interface ProjectRequirement extends BaseEntity {
  project_id: string;
  title: string;
  description: string | null;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: 'draft' | 'approved' | 'rejected';
  created_by: string;
}

export interface ProjectStakeholder extends BaseEntity {
  project_id: string;
  name: string;
  role: string;
  organization: string | null;
  email: string | null;
  phone: string | null;
}

export interface ProjectMilestone extends BaseEntity {
  project_id: string;
  title: string;
  description: string | null;
  phase: ProjectPhase;
  due_date: string;
  completed: boolean;
  completed_at: string | null;
}

export interface ProjectEvaluation extends BaseEntity {
  project_id: string;
  evaluation_type: string;
  rating: number | null;
  criteria: any;
  notes: string | null;
  created_by: string;
}

export const PROJECT_PHASES: Record<ProjectPhase, string> = {
  malbilde: "Målbilde",
  anskaffelse: "Anskaffelse",
  kontraktsforhandlinger: "Kontraktsforhandlinger",
  gjennomforing: "Gjennomføring",
  evaluering: "Evaluering",
};

export const PROJECT_PHASE_ORDER: ProjectPhase[] = [
  'malbilde',
  'anskaffelse',
  'kontraktsforhandlinger',
  'gjennomforing',
  'evaluering',
];

// Supplier types (moved from supplier module)
export type SupplierStatus = 'long_list' | 'short_list' | 'selected' | 'rejected';

export interface ProjectSupplier extends BaseEntity {
  project_id: string;
  company_id: string;
  status: SupplierStatus;
  notes: string | null;
  added_by: string;
  companies?: {
    id: string;
    name: string;
    org_number: string;
    industry_description: string | null;
  };
}

export interface SupplierPerformanceMetric extends BaseEntity {
  project_id: string;
  supplier_id: string | null;
  metric_name: string;
  target_value: number | null;
  actual_value: number | null;
  measurement_date: string;
  notes: string | null;
}

export interface SupplierEvaluation {
  supplier_id: string;
  status: SupplierStatus;
  notes: string;
  strengths?: string[];
  weaknesses?: string[];
  score?: number;
}

export const SUPPLIER_STATUS_LABELS: Record<SupplierStatus, string> = {
  long_list: "Long list",
  short_list: "Short list",
  selected: "Valgt",
  rejected: "Avvist",
};

export const SUPPLIER_STATUS_COLORS: Record<SupplierStatus, string> = {
  long_list: "bg-blue-500",
  short_list: "bg-purple-500",
  selected: "bg-green-500",
  rejected: "bg-gray-500",
};
