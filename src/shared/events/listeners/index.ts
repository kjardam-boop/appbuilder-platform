/**
 * Event listeners initialization
 */
import { TaskAutoCreateListener } from "./taskAutoCreateListener";
import { AIAnalysisListener } from "./aiAnalysisListener";
import { ProjectStatusListener } from "./projectStatusListener";

/**
 * Initialize all event listeners
 * Call this at app startup
 */
export function initEventListeners() {
  console.log("Initializing event listeners...");
  
  TaskAutoCreateListener.init();
  AIAnalysisListener.init();
  ProjectStatusListener.init();
  
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
  
  console.log("Event listeners cleaned up");
}
