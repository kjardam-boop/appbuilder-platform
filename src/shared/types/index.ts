/**
 * Shared types used across the platform
 */

export type { RequestContext, TenantConfig } from "@/modules/tenant/types/tenant.types";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: ResponseMetadata;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface ResponseMetadata {
  request_id: string;
  timestamp: string;
  tenant_id?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export type ResourceAction = 'create' | 'read' | 'update' | 'delete' | 'list';

export interface Permission {
  resource: string;
  action: ResourceAction;
  conditions?: Record<string, any>;
}
