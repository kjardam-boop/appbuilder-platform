/**
 * Database Type Helpers
 * 
 * Bridges between Supabase-generated types and domain types.
 * Used to safely type database queries without @ts-nocheck.
 */

import type { Database } from '@/integrations/supabase/types';

// =============================================================================
// TABLE ROW TYPES
// =============================================================================

// Base row types from Supabase (when types are generated)
export type DbCompany = Database['public']['Tables']['companies']['Row'];
export type DbProject = Database['public']['Tables']['projects']['Row'];
export type DbTask = Database['public']['Tables']['tasks']['Row'];

// Insert types
export type DbCompanyInsert = Database['public']['Tables']['companies']['Insert'];
export type DbProjectInsert = Database['public']['Tables']['projects']['Insert'];
export type DbTaskInsert = Database['public']['Tables']['tasks']['Insert'];

// Update types
export type DbCompanyUpdate = Database['public']['Tables']['companies']['Update'];
export type DbProjectUpdate = Database['public']['Tables']['projects']['Update'];
export type DbTaskUpdate = Database['public']['Tables']['tasks']['Update'];

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard for checking if data exists
 */
export function hasData<T>(data: T | null | undefined): data is T {
  return data !== null && data !== undefined;
}

/**
 * Type guard for checking if array has items
 */
export function hasItems<T>(data: T[] | null | undefined): data is T[] {
  return Array.isArray(data) && data.length > 0;
}

// =============================================================================
// QUERY RESULT HELPERS
// =============================================================================

/**
 * Safe cast for single row results
 * Returns null if data is null/undefined
 */
export function asSingle<T>(data: unknown): T | null {
  if (data === null || data === undefined) return null;
  return data as T;
}

/**
 * Safe cast for array results
 * Returns empty array if data is null/undefined
 */
export function asArray<T>(data: unknown): T[] {
  if (!Array.isArray(data)) return [];
  return data as T[];
}

/**
 * Transform Supabase row to domain type with explicit mapping
 */
export function mapRow<TRow, TDomain>(
  row: TRow | null,
  mapper: (row: TRow) => TDomain
): TDomain | null {
  if (row === null) return null;
  return mapper(row);
}

/**
 * Transform Supabase rows to domain types with explicit mapping
 */
export function mapRows<TRow, TDomain>(
  rows: TRow[] | null,
  mapper: (row: TRow) => TDomain
): TDomain[] {
  if (!rows) return [];
  return rows.map(mapper);
}

// =============================================================================
// SUPABASE QUERY TYPE HELPERS
// =============================================================================

/**
 * Helper type for Supabase query results
 */
export type QueryResult<T> = {
  data: T | null;
  error: Error | null;
};

/**
 * Helper type for Supabase array query results
 */
export type QueryArrayResult<T> = {
  data: T[] | null;
  error: Error | null;
};

// =============================================================================
// COMMON PATTERNS
// =============================================================================

/**
 * Standard error handler for Supabase queries
 */
export function handleQueryError(error: unknown, context: string): never {
  console.error(`[${context}]`, error);
  throw error;
}

/**
 * Create a typed query builder wrapper
 * Usage: const company = await typedQuery(supabase.from('companies').select('*').eq('id', id).single());
 */
export async function typedQuery<T>(
  query: Promise<{ data: T | null; error: Error | null }>
): Promise<T> {
  const { data, error } = await query;
  if (error) throw error;
  if (data === null) throw new Error('No data returned');
  return data;
}

/**
 * Create a typed query builder wrapper that returns null on missing data
 */
export async function typedQueryOptional<T>(
  query: Promise<{ data: T | null; error: Error | null }>
): Promise<T | null> {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Create a typed query builder wrapper for arrays
 */
export async function typedQueryArray<T>(
  query: Promise<{ data: T[] | null; error: Error | null }>
): Promise<T[]> {
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

