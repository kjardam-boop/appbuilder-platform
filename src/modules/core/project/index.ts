/**
 * Project Module
 * Handles project management including:
 * - Project CRUD operations
 * - Requirements management
 * - Stakeholder management
 * - Milestones and phases
 * - Project evaluation
 * - Supplier management (moved from Supplier Module)
 */

// Hooks
export { useProject } from './hooks/useProject';
export { useUserProjects } from './hooks/useUserProjects';
export { useProjectSuppliers } from './hooks/useProjectSuppliers';
export { useSupplierPerformance } from './hooks/useSupplierPerformance';

// Components
export { SupplierCard } from './components/SupplierCard';
export { SupplierStatusBadge } from './components/SupplierStatusBadge';
export { ChangeOwnerDialog } from '../../components/Project/ChangeOwnerDialog';

// Types
export type {
  Project,
  ProjectRequirement,
  ProjectStakeholder,
  ProjectMilestone,
  ProjectEvaluation,
  ProjectPhase,
  ProjectSupplier,
  SupplierStatus,
  SupplierPerformanceMetric,
  SupplierEvaluation,
} from './types/project.types';

export {
  PROJECT_PHASES,
  PROJECT_PHASE_ORDER,
  SUPPLIER_STATUS_LABELS,
  SUPPLIER_STATUS_COLORS,
} from './types/project.types';

// Services
export { ProjectService } from './services/projectService';

// Module metadata
export const PROJECT_MODULE = {
  name: 'project',
  version: '1.0.0',
  description: 'Project management for IT procurement processes, including supplier management',
} as const;
