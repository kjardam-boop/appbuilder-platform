/**
 * Company Classification Event Listener
 * Listens to CompanyClassified events and optionally activates industry modules
 */

import { eventBus } from "../bus";
import { COMPANY_EVENTS, type CompanyClassifiedEvent } from "../index";
import { supabase } from "@/integrations/supabase/client";

let isListenerActive = false;

export function initCompanyClassificationListener() {
  if (isListenerActive) return;

  eventBus.on(COMPANY_EVENTS.CLASSIFIED, handleCompanyClassified as any);
  isListenerActive = true;
  console.log("[CompanyClassification] Listener initialized");
}

export function cleanupCompanyClassificationListener() {
  eventBus.off(COMPANY_EVENTS.CLASSIFIED);
  isListenerActive = false;
  console.log("[CompanyClassification] Listener cleaned up");
}

async function handleCompanyClassified(event: CompanyClassifiedEvent) {
  console.log("[CompanyClassification] Event received:", event);

  try {
    // Optional: Auto-enable industry-specific modules for the tenant
    // This would require tenant context from the event
    // For now, we just log the classification
    
    console.log(
      `[CompanyClassification] Company ${event.companyId} classified as:`,
      event.industryKeys
    );

    if (event.previousIndustryKeys && event.previousIndustryKeys.length > 0) {
      console.log(
        `[CompanyClassification] Previous industries:`,
        event.previousIndustryKeys
      );
    }

    // Future: Could fetch Industry.defaultModules and enable them in tenant config
    // Future: Could create auto-tasks or notifications based on industry
    
  } catch (error) {
    console.error("[CompanyClassification] Error processing event:", error);
  }
}

