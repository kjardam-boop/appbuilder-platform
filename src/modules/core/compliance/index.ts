export { AuditLogService } from "./services/auditLogService";
export { ComplianceService } from "./services/complianceService";

export type {
  AuditLog,
  AuditLogInput,
  RetentionPolicy,
  RetentionPolicyInput,
  DataSubjectRequest,
  DataSubjectRequestInput,
  DataSubjectRequestType,
  DataSubjectRequestStatus,
  PersonalDataMapping,
  DPIATemplate,
  DataExportResult,
} from "./types/compliance.types";

export { DATA_MAP, getDataMapForTable, getPersonalDataTables, getSensitiveColumns } from "./templates/datamap";

// Register module
export const COMPLIANCE_MODULE = {
  name: "compliance",
  version: "1.0.0",
  description: "GDPR compliance, audit logging, and data protection",
};
