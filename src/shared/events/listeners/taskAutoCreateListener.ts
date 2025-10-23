/**
 * Auto-create tasks based on events
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
import { TaskService } from "@/modules/core/tasks";
import type { RequestContext } from "@/shared/types";

export class TaskAutoCreateListener {
  private static unsubscribers: (() => void)[] = [];

  /**
   * Start listening to events and auto-create tasks
   */
  static init() {
    this.cleanup();

    // Project created → create initial tasks
    this.unsubscribers.push(
      eventBus.on<ProjectCreatedEvent>(PROJECT_EVENTS.CREATED, async (event) => {
        console.log("Auto-creating tasks for new project:", event.projectId);
        
        // Create context (simplified - in real app would get from session)
        const ctx: RequestContext = {
          tenantId: "default",
          userId: event.createdBy,
          roles: ["user"],
        };

        try {
          // Task 1: Define project scope
          await TaskService.create(ctx, {
            title: "Definer prosjektomfang og krav",
            description: "Kartlegg krav og definér prosjektets scope",
            entity_type: "project",
            entity_id: event.projectId,
            status: "open",
            priority: "high",
            category_key: "planning",
          });

          // Task 2: Identify suppliers
          await TaskService.create(ctx, {
            title: "Identifiser potensielle leverandører",
            description: "Lag longlist over relevante leverandører",
            entity_type: "project",
            entity_id: event.projectId,
            status: "open",
            priority: "medium",
            category_key: "sourcing",
          });
        } catch (error) {
          console.error("Failed to auto-create project tasks:", error);
        }
      })
    );

    // Document uploaded → create review task
    this.unsubscribers.push(
      eventBus.on<DocumentUploadedEvent>(DOCUMENT_EVENTS.UPLOADED, async (event) => {
        if (!event.projectId) return;

        console.log("Auto-creating review task for document:", event.documentId);

        const ctx: RequestContext = {
          tenantId: "default",
          userId: event.uploadedBy,
          roles: ["user"],
        };

        try {
          await TaskService.create(ctx, {
            title: `Gjennomgå dokument: ${event.documentName}`,
            description: `Gjennomgå og kvalitetssikre opplastet dokument`,
            entity_type: "project",
            entity_id: event.projectId,
            status: "open",
            priority: "medium",
            category_key: "review",
          });
        } catch (error) {
          console.error("Failed to auto-create review task:", error);
        }
      })
    );

    // Supplier scored → create follow-up task
    this.unsubscribers.push(
      eventBus.on<SupplierScoredEvent>(SUPPLIER_EVENTS.SCORED, async (event) => {
        console.log("Auto-creating follow-up task for scored supplier:", event.supplierId);

        const ctx: RequestContext = {
          tenantId: "default",
          userId: event.scoredBy,
          roles: ["user"],
        };

        try {
          if (event.totalScore >= 70) {
            await TaskService.create(ctx, {
              title: `Følg opp ${event.supplierName}`,
              description: `Leverandør scoret ${event.totalScore}% - planlegg videre dialog`,
              entity_type: "project",
              entity_id: event.projectId,
              status: "open",
              priority: "high",
              category_key: "follow_up",
            });
          }
        } catch (error) {
          console.error("Failed to auto-create follow-up task:", error);
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
