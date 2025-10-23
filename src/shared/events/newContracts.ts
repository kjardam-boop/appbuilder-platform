/**
 * New event contracts - replaces old contracts.ts
 */

// Project events
export interface ProjectCreatedEvent {
  projectId: string;
  projectName: string;
  companyId: string;
  createdBy: string;
  createdAt: string;
}

export interface ProjectStatusChangedEvent {
  projectId: string;
  previousStatus: string;
  newStatus: string;
  changedBy: string;
  changedAt: string;
}

// Document events
export interface DocumentUploadedEvent {
  documentId: string;
  documentName: string;
  documentType: string;
  projectId?: string;
  evaluationId?: string;
  uploadedBy: string;
  uploadedAt: string;
  fileSize: number;
  mimeType: string;
}

// Supplier events
export interface SupplierScoredEvent {
  supplierId: string;
  supplierName: string;
  projectId: string;
  totalScore: number;
  scoredBy: string;
  scoredAt: string;
  criteria: {
    name: string;
    score: number;
    weight: number;
  }[];
}

export interface SupplierInvitedEvent {
  supplierId: string;
  supplierName: string;
  projectId: string;
  invitedBy: string;
  invitedAt: string;
}

// Company events
export interface CompanyClassifiedEvent {
  companyId: string;
  orgNumber: string;
  naceCode: string;
  industryKeys: string[];
  previousIndustryKeys?: string[];
}

// Task events
export interface TaskCreatedEvent {
  taskId: string;
  taskTitle: string;
  entityType?: string;
  entityId?: string;
  assignedTo?: string;
  createdBy: string;
  createdAt: string;
}

export interface TaskCompletedEvent {
  taskId: string;
  taskTitle: string;
  completedBy: string;
  completedAt: string;
}

// Event names constants
export const PROJECT_EVENTS = {
  CREATED: "project:created",
  STATUS_CHANGED: "project:status_changed",
} as const;

export const DOCUMENT_EVENTS = {
  UPLOADED: "document:uploaded",
} as const;

export const SUPPLIER_EVENTS = {
  SCORED: "supplier:scored",
  INVITED: "supplier:invited",
} as const;

export const COMPANY_EVENTS = {
  CLASSIFIED: "company:classified",
} as const;

export const TASK_EVENTS = {
  CREATED: "task:created",
  COMPLETED: "task:completed",
} as const;
