/**
 * Company Module
 * Handles all company-related functionality including:
 * - Company search and lookup
 * - Company metadata management
 * - Integration with Brønnøysundregistrene
 */

// Hooks
export { useCompany } from './hooks/useCompany';
export { useCompanySearch } from './hooks/useCompanySearch';
export { useCompanyInteractions } from './hooks/useCompanyInteractions';

// Components
export { CompanyCard } from './components/CompanyCard';
export { default as CompanyLogo } from './components/CompanyLogo';
export { default as CompanySelector } from './components/CompanySelector';

// Types
export type {
  Company,
  CompanyMetadata,
} from './types/company.types';

export type {
  CompanyUser,
  CompanyMembership,
  CompanyRole,
} from './types/companyUser.types';

export {
  COMPANY_ROLES,
  COMPANY_ROLE_DESCRIPTIONS,
} from './types/companyUser.types';

export { CompanyService } from './services/companyService';
export { CompanyUserService } from './services/companyUserService';
export { CompanyClassificationService } from './services/companyClassificationService';
export { classifyByNace, syncFromBrregWithClassification } from './services/companyClassificationHelpers';

// Module metadata
export const COMPANY_MODULE = {
  name: 'company',
  version: '1.0.0',
  description: 'Company management and Brønnøysundregistrene integration',
} as const;
