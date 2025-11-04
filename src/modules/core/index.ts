/**
 * Core Modules
 * Standard business logic modules for the platform
 */

// Admin
export * from './admin';

// AI
export * from './ai';

// Company
export * from './company';

// Document
export * from './document';

// ERP System
export * from './erpsystem';

// Integrations
export * from './integrations';

// Opportunity
export * from './opportunity';

// Project
export * from './project';

// Tasks
export * from './tasks';

// MCP (Model Context Protocol) Server
export * from './mcp';

// Export auth and user modules separately to avoid conflicts
export { AUTH_MODULE } from './auth';
export { USER_MODULE } from './user';
export type { AuthUser, Profile, UserRole, UserRoleRecord } from './user';
