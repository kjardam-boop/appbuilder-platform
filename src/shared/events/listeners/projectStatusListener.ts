/**
 * Update project status based on events
 */
import { eventBus } from "../bus";
import { 
  SUPPLIER_EVENTS,
  TASK_EVENTS,
  type SupplierScoredEvent,
  type TaskCompletedEvent,
} from "../contracts";

export class ProjectStatusListener {
  private static unsubscribers: (() => void)[] = [];

  /**
   * Start listening to events and update project status
   */
  static init() {
    this.cleanup();

    // Supplier scored → potentially move project forward
    this.unsubscribers.push(
      eventBus.on<SupplierScoredEvent>(SUPPLIER_EVENTS.SCORED, async (event) => {
        console.log("Checking if project status should update:", event.projectId);

        try {
          // In real implementation, check if all suppliers are scored
          // and update project status accordingly
          // ProjectService.updateStatusIfReady(event.projectId)
          
          console.log(`Project ${event.projectId} may be ready for next phase`);
        } catch (error) {
          console.error("Failed to update project status:", error);
        }
      })
    );

    // Task completed → check project progress
    this.unsubscribers.push(
      eventBus.on<TaskCompletedEvent>(TASK_EVENTS.COMPLETED, async (event) => {
        console.log("Task completed, checking project progress:", event.taskId);

        try {
          // In real implementation, check if critical tasks are complete
          // and update project status/phase accordingly
          
          console.log(`Project progress updated based on task: ${event.taskTitle}`);
        } catch (error) {
          console.error("Failed to check project progress:", error);
        }
      })
    );
  }

  /**
   * Stop listening and cleanup
   */
  static cleanup() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }
}
