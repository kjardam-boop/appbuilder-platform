/**
 * Company Classification Helpers
 * Helper functions for NACE-based industry classification
 */

import { supabase } from "@/integrations/supabase/client";
import { IndustryService } from "@/modules/core/industry";

/**
 * Classify company by NACE code with audit logging
 * 
 * @param companyId - Company ID
 * @param orgNumber - Organization number
 * @param naceCode - NACE code from Brreg (e.g., "62.020")
 * @param userId - User ID performing the classification (optional)
 * @returns Array of matched industry keys
 */
export async function classifyByNace(
  companyId: string,
  orgNumber: string,
  naceCode: string,
  userId?: string
): Promise<string[]> {
  if (!naceCode) {
    console.log("[Classification] No NACE code provided");
    return [];
  }

  try {
    // Get all industries from cache (5 min TTL)
    const industries = await IndustryService.list(true);

    // Find matching industries by NACE prefix
    const matchedKeys: string[] = [];
    let longestMatchLength = 0;

    for (const industry of industries) {
      for (const code of industry.nace_codes) {
        // Check if NACE code starts with industry code
        if (naceCode.startsWith(code)) {
          // Prefer longer (more specific) matches
          if (code.length > longestMatchLength) {
            matchedKeys.length = 0; // Clear previous matches
            matchedKeys.push(industry.key);
            longestMatchLength = code.length;
          } else if (code.length === longestMatchLength) {
            // Add additional matches of same specificity
            if (!matchedKeys.includes(industry.key)) {
              matchedKeys.push(industry.key);
            }
          }
        }
      }
    }

    // Remove duplicates
    const uniqueKeys = Array.from(new Set(matchedKeys));

    console.log(
      `[Classification] Company ${companyId} (NACE: ${naceCode}) → Industries:`,
      uniqueKeys.length > 0 ? uniqueKeys.join(", ") : "none"
    );

    // Update company industry_keys (without duplicates)
    if (uniqueKeys.length > 0) {
      const { error: updateError } = await supabase
        .from("companies")
        .update({ industry_keys: uniqueKeys })
        .eq("id", companyId);

      if (updateError) {
        console.error("[Classification] Failed to update company:", updateError);
      }
    }

    // Log audit trail (simplified)
    console.log("[Audit] company.classified:", {
      company_id: companyId,
      org_number: orgNumber,
      nace_code: naceCode,
      industry_keys: uniqueKeys,
      matched_count: uniqueKeys.length,
      user_id: userId || "system",
      timestamp: new Date().toISOString(),
    });

    return uniqueKeys;
  } catch (error) {
    console.error("[Classification] Error:", error);
    return [];
  }
}

/**
 * Sync company from Brreg and classify by industry
 * 
 * @param orgNumber - Organization number
 * @param userId - User ID performing the sync (optional)
 * @returns Updated company with industry classification
 */
export async function syncFromBrregWithClassification(
  orgNumber: string,
  userId?: string
): Promise<any> {
  try {
    // Call Brreg API to get company details
    const { data: brregData, error: brregError } = await supabase.functions.invoke(
      "brreg-company-details",
      {
        body: { orgNumber },
      }
    );

    if (brregError) throw brregError;

    const companyData = brregData.company;

    // Check if company exists
    const { data: existingCompany } = await supabase
      .from("companies")
      .select("id, industry_keys")
      .eq("org_number", orgNumber)
      .maybeSingle();

    const updateData: any = {
      org_number: orgNumber,
      name: companyData.name,
      org_form: companyData.orgForm,
      industry_code: companyData.industryCode,
      industry_description: companyData.industryDescription,
      employees: companyData.employees,
      website: companyData.website,
      last_fetched_at: new Date().toISOString(),
    };

    let companyId: string;

    if (existingCompany) {
      // Update existing company
      const { error: updateError } = await supabase
        .from("companies")
        .update(updateData)
        .eq("id", existingCompany.id);

      if (updateError) throw updateError;
      companyId = existingCompany.id;
    } else {
      // Create new company
      const { data: newCompany, error: insertError } = await supabase
        .from("companies")
        .insert(updateData)
        .select("id")
        .single();

      if (insertError) throw insertError;
      companyId = newCompany.id;
    }

    // Classify by NACE code
    let industryKeys: string[] = [];
    if (companyData.industryCode) {
      industryKeys = await classifyByNace(
        companyId,
        orgNumber,
        companyData.industryCode,
        userId
      );
    }

    // Return updated company with industry keys
    return {
      id: companyId,
      ...updateData,
      industry_keys: industryKeys,
    };
  } catch (error) {
    console.error("[SyncBrreg] Error:", error);
    throw error;
  }
}

