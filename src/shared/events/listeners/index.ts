/**
 * Event listeners initialization
 */
import { TaskAutoCreateListener } from "./taskAutoCreateListener";
import { AIAnalysisListener } from "./aiAnalysisListener";
import { ProjectStatusListener } from "./projectStatusListener";
import { initCompanyClassificationListener, cleanupCompanyClassificationListener } from "./companyClassificationListener";
import { registerProjectCreatedListener, unregisterProjectCreatedListener } from "@/modules/core/integrations";

/**
 * Initialize all event listeners
 * Call this at app startup
 */
export function initEventListeners() {
  console.log("Initializing event listeners...");
  
  TaskAutoCreateListener.init();
  AIAnalysisListener.init();
  ProjectStatusListener.init();
  initCompanyClassificationListener();
  registerProjectCreatedListener();
  
  console.log("Event listeners initialized");
}

/**
 * Cleanup all event listeners
 * Call this on app unmount
 */
export function cleanupEventListeners() {
  console.log("Cleaning up event listeners...");
  
  TaskAutoCreateListener.cleanup();
  AIAnalysisListener.cleanup();
  ProjectStatusListener.cleanup();
  cleanupCompanyClassificationListener();
  unregisterProjectCreatedListener();
  
  console.log("Event listeners cleaned up");
}
