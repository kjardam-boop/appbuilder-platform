import type { PersonalDataMapping } from "../types/compliance.types";

/**
 * Data map for GDPR compliance
 * Documents all personal data processed by the system
 */
export const DATA_MAP: PersonalDataMapping[] = [
  {
    table: "profiles",
    columns: [
      {
        name: "id",
        type: "uuid",
        sensitive: false,
        purpose: "User identification",
        retention: "Account lifetime + 30 days",
      },
      {
        name: "email",
        type: "text",
        sensitive: true,
        purpose: "Authentication and communication",
        retention: "Account lifetime + 30 days",
      },
      {
        name: "first_name",
        type: "text",
        sensitive: true,
        purpose: "User identification and personalization",
        retention: "Account lifetime",
      },
      {
        name: "last_name",
        type: "text",
        sensitive: true,
        purpose: "User identification and personalization",
        retention: "Account lifetime",
      },
      {
        name: "phone",
        type: "text",
        sensitive: true,
        purpose: "Communication and account recovery",
        retention: "Account lifetime",
      },
      {
        name: "avatar_url",
        type: "text",
        sensitive: false,
        purpose: "User profile display",
        retention: "Account lifetime",
      },
    ],
    legal_basis: "Contract (Art. 6(1)(b) GDPR)",
    data_category: "Identity and contact data",
  },
  {
    table: "companies",
    columns: [
      {
        name: "id",
        type: "uuid",
        sensitive: false,
        purpose: "Company identification",
        retention: "Business relationship + 7 years",
      },
      {
        name: "name",
        type: "text",
        sensitive: false,
        purpose: "Company identification",
        retention: "Business relationship + 7 years",
      },
      {
        name: "org_number",
        type: "text",
        sensitive: false,
        purpose: "Legal identification (public registry data)",
        retention: "Business relationship + 7 years",
      },
      {
        name: "website",
        type: "text",
        sensitive: false,
        purpose: "Contact and verification",
        retention: "Business relationship + 7 years",
      },
      {
        name: "email",
        type: "text",
        sensitive: true,
        purpose: "Business communication",
        retention: "Business relationship + 3 years",
      },
      {
        name: "phone",
        type: "text",
        sensitive: true,
        purpose: "Business communication",
        retention: "Business relationship + 3 years",
      },
    ],
    legal_basis: "Legitimate interest (Art. 6(1)(f) GDPR)",
    data_category: "Business contact data",
  },
  {
    table: "audit_logs",
    columns: [
      {
        name: "user_id",
        type: "uuid",
        sensitive: false,
        purpose: "Security and compliance monitoring",
        retention: "3 years (regulatory requirement)",
      },
      {
        name: "ip_address",
        type: "inet",
        sensitive: true,
        purpose: "Security and fraud prevention",
        retention: "3 years",
      },
      {
        name: "user_agent",
        type: "text",
        sensitive: false,
        purpose: "Technical diagnostics",
        retention: "3 years",
      },
      {
        name: "before_state",
        type: "jsonb",
        sensitive: true,
        purpose: "Audit trail and data recovery",
        retention: "3 years",
      },
      {
        name: "after_state",
        type: "jsonb",
        sensitive: true,
        purpose: "Audit trail and data recovery",
        retention: "3 years",
      },
    ],
    legal_basis: "Legal obligation (Art. 6(1)(c) GDPR)",
    data_category: "Audit and logging data",
  },
  {
    table: "projects",
    columns: [
      {
        name: "id",
        type: "uuid",
        sensitive: false,
        purpose: "Project identification",
        retention: "Project completion + 7 years",
      },
      {
        name: "name",
        type: "text",
        sensitive: false,
        purpose: "Project management",
        retention: "Project completion + 7 years",
      },
      {
        name: "description",
        type: "text",
        sensitive: false,
        purpose: "Project documentation",
        retention: "Project completion + 7 years",
      },
      {
        name: "owner_id",
        type: "uuid",
        sensitive: false,
        purpose: "Access control and accountability",
        retention: "Project completion + 7 years",
      },
      {
        name: "customer_id",
        type: "uuid",
        sensitive: false,
        purpose: "Business relationship management",
        retention: "Project completion + 7 years",
      },
    ],
    legal_basis: "Contract (Art. 6(1)(b) GDPR)",
    data_category: "Project and business data",
  },
  {
    table: "supplier_evaluation_responses",
    columns: [
      {
        name: "supplier_id",
        type: "uuid",
        sensitive: false,
        purpose: "Supplier assessment",
        retention: "Procurement process + 3 years",
      },
      {
        name: "answer",
        type: "text",
        sensitive: false,
        purpose: "Supplier evaluation",
        retention: "Procurement process + 3 years",
      },
      {
        name: "score",
        type: "numeric",
        sensitive: false,
        purpose: "Supplier comparison",
        retention: "Procurement process + 3 years",
      },
    ],
    legal_basis: "Legitimate interest (Art. 6(1)(f) GDPR)",
    data_category: "Supplier assessment data",
  },
];

/**
 * Get data map for specific table
 */
export function getDataMapForTable(tableName: string): PersonalDataMapping | undefined {
  return DATA_MAP.find((m) => m.table === tableName);
}

/**
 * Get all tables that contain personal data
 */
export function getPersonalDataTables(): string[] {
  return DATA_MAP.map((m) => m.table);
}

/**
 * Get sensitive columns for a table
 */
export function getSensitiveColumns(tableName: string): string[] {
  const mapping = getDataMapForTable(tableName);
  if (!mapping) return [];
  return mapping.columns.filter((c) => c.sensitive).map((c) => c.name);
}
