/**
 * Auth Module
 * Handles authentication and authorization including:
 * - User authentication
 * - Role management
 * - Profile management
 */

// Types
export type {
  AuthUser,
  Profile,
  UserRole,
  UserRoleRecord,
} from './types/auth.types';

export { ROLE_LABELS } from './types/auth.types';

// Services
export { AuthService } from './services/authService';

// Module metadata
export const AUTH_MODULE = {
  name: 'auth',
  version: '1.0.0',
  description: 'Authentication and authorization management',
} as const;
