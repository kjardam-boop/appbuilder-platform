/**
 * Events module
 * Central event bus and contracts
 */

export { eventBus } from "./bus";

export {
  PROJECT_EVENTS,
  DOCUMENT_EVENTS,
  SUPPLIER_EVENTS,
  COMPANY_EVENTS,
  TASK_EVENTS,
} from "./newContracts";

export type {
  ProjectCreatedEvent,
  ProjectStatusChangedEvent,
  DocumentUploadedEvent,
  SupplierScoredEvent,
  SupplierInvitedEvent,
  CompanyClassifiedEvent,
  TaskCreatedEvent,
  TaskCompletedEvent,
} from "./newContracts";

export { initEventListeners, cleanupEventListeners } from "./listeners";
