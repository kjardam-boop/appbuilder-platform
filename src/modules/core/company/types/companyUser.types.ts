export type CompanyRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface CompanyUser {
  id: string;
  company_id: string;
  user_id: string;
  role: CompanyRole;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    email: string;
    profile?: {
      full_name: string;
    };
  };
  company?: {
    id: string;
    name: string;
    org_number: string;
  };
}

export interface CompanyMembership {
  company_id: string;
  company_name: string;
  org_number: string;
  role: CompanyRole;
  joined_at: string;
}

export const COMPANY_ROLES: Record<CompanyRole, string> = {
  owner: 'Eier',
  admin: 'Administrator',
  member: 'Medlem',
  viewer: 'Betrakter',
};

export const COMPANY_ROLE_DESCRIPTIONS: Record<CompanyRole, string> = {
  owner: 'Full kontroll over selskapet, kan administrere brukere',
  admin: 'Kan administrere selskapsdata, men ikke brukere',
  member: 'Standard medlem, kan jobbe med prosjekter og oppgaver',
  viewer: 'Kun lesetilgang',
};
