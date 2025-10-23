/**
 * Company Classification Service
 * Handles auto-classification of companies based on NACE codes
 */

import { IndustryService } from "@/modules/core/industry";
import { eventBus } from "@/shared/events";
import { COMPANY_EVENTS } from "@/shared/events";
import type { CompanyClassifiedEvent } from "@/shared/events";

export class CompanyClassificationService {
  /**
   * Classify a company by its NACE code and update industry_keys
   */
  static async classifyCompany(
    companyId: string,
    orgNumber: string,
    naceCode: string,
    previousIndustryKeys?: string[]
  ): Promise<string[]> {
    if (!naceCode) {
      console.log("[Classification] No NACE code provided for company", companyId);
      return [];
    }

    try {
      // Find matching industries by NACE prefix
      const industryKeys = await IndustryService.classifyMultipleNACE([naceCode]);

      console.log(
        `[Classification] Company ${companyId} (NACE: ${naceCode}) → Industries:`,
        industryKeys
      );

      // Emit event for listeners
      const event: CompanyClassifiedEvent = {
        companyId,
        orgNumber,
        naceCode,
        industryKeys,
        previousIndustryKeys,
      };

      eventBus.emit(COMPANY_EVENTS.CLASSIFIED, event);

      return industryKeys;
    } catch (error) {
      console.error("[Classification] Error classifying company:", error);
      return [];
    }
  }

  /**
   * Classify multiple companies in batch
   */
  static async classifyBatch(
    companies: Array<{
      id: string;
      orgNumber: string;
      naceCode: string;
      currentIndustryKeys?: string[];
    }>
  ): Promise<Map<string, string[]>> {
    const results = new Map<string, string[]>();

    for (const company of companies) {
      const industryKeys = await this.classifyCompany(
        company.id,
        company.orgNumber,
        company.naceCode,
        company.currentIndustryKeys
      );
      results.set(company.id, industryKeys);
    }

    return results;
  }
}
