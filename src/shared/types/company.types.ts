/**
 * Shared Company Types
 * 
 * Centralized type definitions for company-related entities.
 * Used across: Customers, Partners, Vendors, Prospects pages
 */

import { z } from 'zod';

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export const CompanyRoleValues = ['external_system_vendor', 'customer', 'partner', 'prospect'] as const;
export type CompanyRole = typeof CompanyRoleValues[number];

export const CrmStatusValues = ['prospect', 'qualified_lead', 'customer', 'former_customer', 'partner'] as const;
export type CrmStatus = typeof CrmStatusValues[number];

export const COMPANY_ROLE_LABELS: Record<CompanyRole, string> = {
  external_system_vendor: 'Systemleverandør',
  customer: 'Kunde',
  partner: 'Implementeringspartner',
  prospect: 'Prospekt',
};

export const CRM_STATUS_LABELS: Record<CrmStatus, string> = {
  prospect: 'Prospekt',
  qualified_lead: 'Kvalifisert lead',
  customer: 'Kunde',
  former_customer: 'Tidligere kunde',
  partner: 'Partner',
};

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

export const CompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Navn er påkrevd'),
  org_number: z.string().nullable(),
  industry_description: z.string().nullable(),
  industry_code: z.string().nullable(),
  employees: z.number().nullable(),
  website: z.string().url().nullable().or(z.literal('')),
  company_roles: z.array(z.enum(CompanyRoleValues)).default([]),
  crm_status: z.enum(CrmStatusValues).nullable(),
  driftsinntekter: z.number().nullable(),
  driftsresultat: z.number().nullable(),
  customer_since: z.string().nullable(),
  last_interaction_date: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CompanyCreateSchema = CompanySchema.omit({ 
  id: true, 
  created_at: true, 
  updated_at: true 
});

export const CompanyUpdateSchema = CompanySchema.partial().required({ id: true });

// =============================================================================
// TYPES (derived from schemas)
// =============================================================================

export type Company = z.infer<typeof CompanySchema>;
export type CompanyCreate = z.infer<typeof CompanyCreateSchema>;
export type CompanyUpdate = z.infer<typeof CompanyUpdateSchema>;

// Lightweight version for lists
export interface CompanyListItem {
  id: string;
  name: string;
  org_number: string | null;
  industry_description: string | null;
  employees: number | null;
  driftsinntekter: number | null;
  website: string | null;
  company_roles: CompanyRole[];
  crm_status?: CrmStatus | null;
}

// =============================================================================
// FILTER & SORT TYPES
// =============================================================================

export type CompanySortField = 'name' | 'org_number' | 'industry_description' | 'employees' | 'driftsinntekter';
export type SortDirection = 'asc' | 'desc' | null;

export interface CompanyFilters {
  searchName: string;
  searchOrgNumber: string;
  searchIndustry: string;
  roles?: CompanyRole[];
  crmStatus?: CrmStatus[];
}

export interface CompanyListOptions {
  filters: CompanyFilters;
  sort: {
    field: CompanySortField | null;
    direction: SortDirection;
  };
  pagination: {
    page: number;
    pageSize: number;
  };
}

