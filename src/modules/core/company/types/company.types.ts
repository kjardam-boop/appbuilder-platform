import { BaseEntity } from "@/core/types/common.types";

export type CompanyRole = 'external_system_vendor' | 'customer' | 'partner' | 'prospect';

export interface Company extends BaseEntity {
  org_number: string;
  name: string;
  org_form: string | null;
  industry_code: string | null;
  industry_description: string | null;
  employees: number | null;
  founding_date: string | null;
  website: string | null;
  contact_person: string | null;
  contact_person_role: string | null;
  description: string | null;
  last_fetched_at: string | null;
  last_synced_at: string | null;
  is_saved: boolean;
  driftsinntekter: number | null;
  driftsresultat: number | null;
  egenkapital: number | null;
  totalkapital: number | null;
  // CRM fields
  crm_status: 'prospect' | 'qualified_lead' | 'customer' | 'former_customer' | 'partner' | null;
  customer_since: string | null;
  last_interaction_date: string | null;
  segment: string | null;
  // Supplier fields
  company_roles: CompanyRole[];
  is_approved_supplier: boolean;
  supplier_certifications: string[] | null;
}

export interface ContactPerson {
  full_name: string;
  title?: string;
  email?: string;
  phone?: string;
  department?: string;
  is_primary?: boolean;
  notes?: string;
}

export interface CompanyMetadata extends BaseEntity {
  company_id: string;
  sales_assessment_score: number | null;
  priority_level: 'low' | 'medium' | 'high' | null;
  notes: string | null;
  in_crm: boolean;
  for_followup: boolean;
  has_potential: boolean;
  score: number | null;
  last_viewed_at: string | null;
  logo_url: string | null;
  contact_persons: ContactPerson[];
}

export interface BrregCompanySearchResult {
  orgNumber: string;
  name: string;
  orgForm: string;
  industryCode: string;
  industryDescription: string;
  employees: number;
  foundingDate: string;
  website: string;
  isSaved?: boolean;
}

export interface EnhancedCompanyData {
  navn: string;
  organisasjonsnummer: string;
  kontaktperson: string;
  kontaktpersonRolle: string;
  kontaktpersonTelefon: string;
  telefonnummerKilde: string;
  telefonnummerAlternativer: Array<{ telefon: string; adresse: string }>;
  hjemmeside: string;
  forretningsadresse: {
    adresse: string;
    postnummer: string;
    poststed: string;
  } | null;
}

export interface FinancialData {
  organisasjonsnummer: string;
  driftsinntekter: Array<{ ar: number; belop: number }>;
  driftskostnader: number;
  lonnskostnader: number;
  innskuttEgenkapital: number;
  opptjentEgenkapital?: number;
  egenkapital: number;
  resultat: number;
  driftsresultat: number;
  totalkapital: number;
  totalGjeld?: number;
  antallAnsatte: number;
  konkurs: boolean;
  underAvvikling: boolean;
  underTvangsavvikling: boolean;
  valuta: string;
  regnskapsaar?: number;
}

export interface HierarchicalCompany {
  organisasjonsnummer: string;
  navn: string;
  antallAnsatte: number;
  naeringskode?: {
    kode: string;
    beskrivelse: string;
  };
  driftsinntekter?: number;
  level: number;
  type: 'parent' | 'main' | 'sibling' | 'subsidiary';
  children: HierarchicalCompany[];
  isManual?: boolean;
}

export interface CustomerInteraction extends BaseEntity {
  company_id: string;
  interaction_type: 'meeting' | 'email' | 'call' | 'other';
  interaction_date: string;
  notes: string | null;
  outcome: string | null;
  created_by: string;
}

export const CRM_STATUSES: Record<string, string> = {
  prospect: 'Prospekt',
  qualified_lead: 'Kvalifisert lead',
  customer: 'Kunde',
  former_customer: 'Tidligere kunde',
  partner: 'Partner',
};

export const INTERACTION_TYPES: Record<string, string> = {
  meeting: 'Møte',
  email: 'E-post',
  call: 'Telefonsamtale',
  other: 'Annet',
};

export const COMPANY_ROLES: Record<CompanyRole, string> = {
  external_system_vendor: 'Systemleverandør',
  customer: 'Kunde',
  partner: 'Implementeringspartner',
  prospect: 'Prospekt',
};
