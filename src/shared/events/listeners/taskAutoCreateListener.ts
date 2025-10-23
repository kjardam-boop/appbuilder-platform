/**
 * Auto-create tasks based on events
 * DISABLED: Task module needs refactoring
 */
import { eventBus } from "../bus";
import { 
  PROJECT_EVENTS, 
  DOCUMENT_EVENTS, 
  SUPPLIER_EVENTS,
  type ProjectCreatedEvent,
  type DocumentUploadedEvent,
  type SupplierScoredEvent,
} from "../contracts";

export class TaskAutoCreateListener {
  private static unsubscribers: (() => void)[] = [];

  /**
   * Start listening to events and auto-create tasks
   * Currently disabled - to be re-enabled after task module refactoring
   */
  static init() {
    console.log("TaskAutoCreateListener: Disabled pending task module refactor");
    // this.cleanup();
    // Implementation will be added after task module is refactored
  }

  /**
   * Stop listening and cleanup
   */
  static cleanup() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }
}
