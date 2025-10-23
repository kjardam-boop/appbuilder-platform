/**
 * Document Module
 * Handles document management including:
 * - Document storage
 * - Document versioning
 * - Phase-specific documents
 */

// Hooks
export { useProjectDocuments } from './hooks/useProjectDocuments';

// Types
export type {
  Document,
  DocumentVersion,
} from './types/document.types';

export { DOCUMENT_PHASES } from './types/document.types';

// Services
export { DocumentService } from './services/documentService';

// Module metadata
export const DOCUMENT_MODULE = {
  name: 'document',
  version: '1.0.0',
  description: 'Document management and versioning for projects',
} as const;
