/**
 * Core Module
 * Shared infrastructure and utilities used across all modules
 */

// Types
export type { BaseEntity, PaginationParams, ApiResponse, SearchFilters } from './types/common.types';

// Utils
export { default as ModuleRegistry } from './moduleRegistry';
export { default as EventBus } from './eventBus';

// Initialize modules
import ModuleRegistry from './moduleRegistry';
import { COMPANY_MODULE } from '@/modules/core/company';
import { AI_MODULE } from '@/modules/core/ai';
import { PROJECT_MODULE } from '@/modules/core/project';
import { DOCUMENT_MODULE } from '@/modules/core/document';
import { AUTH_MODULE } from '@/modules/core/auth';
import { USER_MODULE } from '@/modules/core/user';
import { TASKS_MODULE } from '@/modules/core/tasks';
import { OPPORTUNITY_MODULE } from '@/modules/core/opportunity';
import { ADMIN_MODULE } from '@/modules/core/admin';
import { SUPPLIER_MODULE } from '@/modules/core/supplier';
import { ERPSYSTEM_MODULE } from '@/modules/core/erpsystem';
import { INTEGRATION_MODULE } from '@/modules/core/integrations';

// Register all modules
ModuleRegistry.register({ ...COMPANY_MODULE, enabled: true });
ModuleRegistry.register({ ...AI_MODULE, enabled: true });
ModuleRegistry.register({ ...PROJECT_MODULE, enabled: true });
ModuleRegistry.register({ ...DOCUMENT_MODULE, enabled: true });
ModuleRegistry.register({ ...AUTH_MODULE, enabled: true }); // Deprecated, use USER_MODULE
ModuleRegistry.register({ ...USER_MODULE, enabled: true });
ModuleRegistry.register({ ...TASKS_MODULE, enabled: true }); // Cross-cutting task management
ModuleRegistry.register({ ...OPPORTUNITY_MODULE, enabled: true }); // Sales pipeline
ModuleRegistry.register({ ...ADMIN_MODULE, enabled: true }); // Admin tools
ModuleRegistry.register({ ...SUPPLIER_MODULE, enabled: true }); // Supplier evaluation
ModuleRegistry.register({ ...ERPSYSTEM_MODULE, enabled: true }); // ERP systems
ModuleRegistry.register({ ...INTEGRATION_MODULE, enabled: true }); // Third-party integrations

console.log('[Core] Modules registered:', ModuleRegistry.getEnabled().map(m => m.name));
