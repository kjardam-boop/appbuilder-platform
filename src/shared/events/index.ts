/**
 * Platform event types and utilities
 */

import EventBus from "@/core/eventBus";

export interface PlatformEvent {
  type: string;
  tenant_id: string;
  user_id?: string;
  timestamp: string;
  data: Record<string, any>;
}

/**
 * Emit a platform event
 */
export function emitPlatformEvent(event: PlatformEvent) {
  EventBus.emit(`platform:${event.type}`, event);
  EventBus.emit(`tenant:${event.tenant_id}:${event.type}`, event);
}

/**
 * Subscribe to platform events
 */
export function onPlatformEvent(eventType: string, callback: (event: PlatformEvent) => void) {
  EventBus.on(`platform:${eventType}`, callback);
}

/**
 * Subscribe to tenant-specific events
 */
export function onTenantEvent(
  tenantId: string,
  eventType: string,
  callback: (event: PlatformEvent) => void
) {
  EventBus.on(`tenant:${tenantId}:${eventType}`, callback);
}

/**
 * Unsubscribe from events
 */
export function offPlatformEvent(eventType: string, callback: (event: PlatformEvent) => void) {
  EventBus.off(`platform:${eventType}`, callback);
}

export function offTenantEvent(
  tenantId: string,
  eventType: string,
  callback: (event: PlatformEvent) => void
) {
  EventBus.off(`tenant:${tenantId}:${eventType}`, callback);
}

// Common event types
export const PLATFORM_EVENTS = {
  TENANT_CREATED: 'tenant.created',
  TENANT_UPDATED: 'tenant.updated',
  TENANT_DISABLED: 'tenant.disabled',
  MODULE_ENABLED: 'module.enabled',
  MODULE_DISABLED: 'module.disabled',
  USER_LOGGED_IN: 'user.logged_in',
  USER_LOGGED_OUT: 'user.logged_out',
} as const;
