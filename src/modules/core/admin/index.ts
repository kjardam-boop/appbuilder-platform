/**
 * Admin Module
 * Administrative components and functionality
 */

// Components
export { TaskCategoryManager } from './components/TaskCategoryManager';

// Module metadata
export const ADMIN_MODULE = {
  name: 'admin',
  version: '1.0.0',
  description: 'Administrative tools and settings',
} as const;
