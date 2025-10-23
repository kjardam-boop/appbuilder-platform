import { BaseEntity } from "@/core/types/common.types";
import { ProjectPhase } from "@/modules/core/project/types/project.types";

export type ContractType = 'license' | 'implementation' | 'other';

export interface Document extends BaseEntity {
  project_id: string;
  title: string;
  content: string | null;
  file_url: string | null;
  phase: ProjectPhase;
  uploaded_by: string;
  erp_system_id?: string;
  contract_type?: ContractType | null;
  related_company_id?: string | null;
}

export interface DocumentVersion extends BaseEntity {
  document_id: string;
  version_number: number;
  content: string | null;
  file_url: string | null;
  changed_by: string;
  change_notes: string | null;
}

export const DOCUMENT_PHASES: Record<ProjectPhase, string> = {
  malbilde: "Målbilde",
  anskaffelse: "Anskaffelse",
  kontraktsforhandlinger: "Kontraktsforhandlinger",
  gjennomforing: "Gjennomføring",
  evaluering: "Evaluering",
};
