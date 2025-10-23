/**
 * Trigger AI analysis based on events
 */
import { eventBus } from "../bus";
import { 
  DOCUMENT_EVENTS,
  SUPPLIER_EVENTS,
  type DocumentUploadedEvent,
  type SupplierScoredEvent,
} from "../contracts";

export class AIAnalysisListener {
  private static unsubscribers: (() => void)[] = [];

  /**
   * Start listening to events and trigger AI analysis
   */
  static init() {
    this.cleanup();

    // Document uploaded → analyze content
    this.unsubscribers.push(
      eventBus.on<DocumentUploadedEvent>(DOCUMENT_EVENTS.UPLOADED, async (event) => {
        console.log("Triggering AI analysis for document:", event.documentId);
        
        // In real implementation, this would call AI service
        // AIService.analyzeDocument(event.documentId)
        
        try {
          // Placeholder for AI analysis
          console.log(`AI analysis queued for: ${event.documentName}`);
        } catch (error) {
          console.error("Failed to trigger AI analysis:", error);
        }
      })
    );

    // Supplier scored → generate insights
    this.unsubscribers.push(
      eventBus.on<SupplierScoredEvent>(SUPPLIER_EVENTS.SCORED, async (event) => {
        console.log("Generating AI insights for supplier:", event.supplierId);

        try {
          // Placeholder for AI insights generation
          console.log(`AI insights queued for supplier: ${event.supplierName} (score: ${event.totalScore}%)`);
        } catch (error) {
          console.error("Failed to generate AI insights:", error);
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
