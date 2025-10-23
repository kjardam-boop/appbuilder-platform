/**
 * Common types used across all modules
 */

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface SearchFilters {
  [key: string]: any;
}
