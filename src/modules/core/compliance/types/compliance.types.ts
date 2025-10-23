import { BaseEntity } from "@/core/types/common.types";

/**
 * Audit log entry for all write operations
 */
export interface AuditLog extends BaseEntity {
  tenant_id: string;
  user_id: string | null;
  resource: string;
  action: "create" | "update" | "delete";
  before_state: Record<string, any> | null;
  after_state: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  timestamp: string;
}

export interface AuditLogInput {
  tenant_id: string;
  user_id?: string;
  resource: string;
  action: "create" | "update" | "delete";
  before_state?: Record<string, any>;
  after_state?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Retention policy for data lifecycle management
 */
export interface RetentionPolicy extends BaseEntity {
  tenant_id: string;
  resource_type: string;
  retention_days: number;
  anonymize_before_delete: boolean;
  policy_config: Record<string, any> | null;
  updated_at: string;
}

export interface RetentionPolicyInput {
  tenant_id: string;
  resource_type: string;
  retention_days: number;
  anonymize_before_delete?: boolean;
  policy_config?: Record<string, any>;
}

/**
 * GDPR data subject request
 */
export type DataSubjectRequestType = "export" | "delete" | "rectify";
export type DataSubjectRequestStatus = "pending" | "processing" | "completed" | "failed";

export interface DataSubjectRequest extends BaseEntity {
  tenant_id: string;
  subject_email: string;
  request_type: DataSubjectRequestType;
  status: DataSubjectRequestStatus;
  requested_at: string;
  completed_at: string | null;
  requested_by: string | null;
  result_data: Record<string, any> | null;
  error_message: string | null;
  updated_at: string;
}

export interface DataSubjectRequestInput {
  tenant_id: string;
  subject_email: string;
  request_type: DataSubjectRequestType;
  requested_by?: string;
}

/**
 * Data mapping for GDPR compliance
 */
export interface PersonalDataMapping {
  table: string;
  columns: {
    name: string;
    type: string;
    sensitive: boolean;
    purpose: string;
    retention: string;
  }[];
  legal_basis: string;
  data_category: string;
}

/**
 * DPIA (Data Protection Impact Assessment) template
 */
export interface DPIATemplate {
  id: string;
  title: string;
  description: string;
  sections: {
    title: string;
    questions: string[];
    guidance: string;
  }[];
}

/**
 * Export result for data subject requests
 */
export interface DataExportResult {
  subject_email: string;
  exported_at: string;
  data: {
    [resource: string]: any[];
  };
  metadata: {
    total_records: number;
    tables_included: string[];
  };
}
