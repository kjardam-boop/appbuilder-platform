import { ReactNode } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface FilterConfig {
  [key: string]: string | boolean | number | string[] | { min?: number; max?: number } | { from?: string; to?: string } | null;
}

export type ColumnType = 
  | 'text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'custom'
  | 'multiline'
  | 'select'
  | 'action';

export interface ColumnDef<T> {
  key: string;
  label: string;
  type: ColumnType;
  visible?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  multiSelect?: boolean;
  sticky?: 'left' | 'right' | null;
  width?: number;
  render?: (value: any, row: T) => ReactNode;
  filterOptions?: Array<{ value: string | boolean; label: string }>;
}

export interface TableConfig<T> {
  columns: ColumnDef<T>[];
  sortConfig: SortConfig[];
  filterConfig: FilterConfig;
  configVersion?: number;
}
