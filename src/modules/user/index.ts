/**
 * User Module
 * Handles user authentication, profiles, and role management including:
 * - Authentication (sign in, sign up, sign out)
 * - User profiles
 * - Role-based access control (RBAC)
 * - User administration
 */

// Hooks
export { useAuth, AuthProvider } from './hooks/useAuth';
export { useCurrentUser } from './hooks/useCurrentUser';
export { useAdminRole } from './hooks/useUserRole';

// Components
export { UserRoleBadge } from './components/UserRoleBadge';
export { UserList } from './components/UserList';
export { CompanyAccessManager } from './components/CompanyAccessManager';

// Types
export type {
  AuthUser,
  Profile,
  UserRole,
  UserRoleRecord,
} from './types/user.types';

export {
  USER_ROLES,
  ROLE_DESCRIPTIONS,
} from './types/user.types';

// Services
export { UserService } from './services/userService';

// Module metadata
export const USER_MODULE = {
  name: 'user',
  version: '1.0.0',
  description: 'User authentication, profiles, and role management',
} as const;
