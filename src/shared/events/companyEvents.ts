/**
 * Company-related events
 */

export interface CompanyClassifiedEvent {
  companyId: string;
  orgNumber: string;
  naceCode: string;
  industryKeys: string[];
  previousIndustryKeys?: string[];
}

export const COMPANY_EVENTS = {
  CLASSIFIED: "company:classified",
} as const;
