import { SortConfig, FilterConfig } from "@/components/DataTable/types";

export const sortData = <T extends Record<string, any>>(
  data: T[],
  sortConfig: SortConfig[]
): T[] => {
  if (sortConfig.length === 0) return data;

  return [...data].sort((a, b) => {
    for (const sort of sortConfig) {
      if (!sort.direction) continue;

      const aVal = a[sort.key];
      const bVal = b[sort.key];

      // Handle null/undefined
      if (aVal == null && bVal == null) continue;
      if (aVal == null) return sort.direction === 'asc' ? 1 : -1;
      if (bVal == null) return sort.direction === 'asc' ? -1 : 1;

      let comparison = 0;

      // Check if values are dates
      if (aVal instanceof Date && bVal instanceof Date) {
        comparison = aVal.getTime() - bVal.getTime();
      } else if (typeof aVal === 'string' && typeof bVal === 'string') {
        // Try to parse as dates if they look like date strings
        const aDate = Date.parse(aVal);
        const bDate = Date.parse(bVal);
        if (!isNaN(aDate) && !isNaN(bDate)) {
          comparison = aDate - bDate;
        } else {
          comparison = aVal.localeCompare(bVal, 'no');
        }
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }

      if (comparison !== 0) {
        return sort.direction === 'asc' ? comparison : -comparison;
      }
    }
    return 0;
  });
};

export const filterData = <T extends Record<string, any>>(
  data: T[],
  filterConfig: FilterConfig
): T[] => {
  return data.filter(row => {
    return Object.entries(filterConfig).every(([key, filterValue]) => {
      if (filterValue === '' || filterValue == null) return true;

      const rowValue = row[key];

      // Array filters (multiselect)
      if (Array.isArray(filterValue)) {
        if (filterValue.length === 0) return true;
        return filterValue.includes(String(rowValue));
      }

      // SkatteFUNN år filter (special case)
      if (key === 'skattefunn_years' && typeof filterValue === 'string') {
        const yearKey = `skattefunn_${filterValue}`;
        return row[yearKey] === true;
      }

      // Boolean filters
      if (typeof filterValue === 'boolean') {
        return rowValue === filterValue;
      }

      // Number range filters
      if (typeof filterValue === 'object' && ('min' in filterValue || 'max' in filterValue)) {
        const numValue = Number(rowValue);
        if (isNaN(numValue)) return false;
        if (filterValue.min != null && numValue < filterValue.min) return false;
        if (filterValue.max != null && numValue > filterValue.max) return false;
        return true;
      }

      // Date range filters
      if (typeof filterValue === 'object' && ('from' in filterValue || 'to' in filterValue)) {
        const dateValue = new Date(rowValue);
        if (isNaN(dateValue.getTime())) return false;
        if (filterValue.from && dateValue < new Date(filterValue.from)) return false;
        if (filterValue.to && dateValue > new Date(filterValue.to)) return false;
        return true;
      }

      // Text search
      if (typeof filterValue === 'string') {
        return String(rowValue || '').toLowerCase().includes(filterValue.toLowerCase());
      }

      return true;
    });
  });
};

export const saveTableConfig = (key: string, config: any) => {
  localStorage.setItem(`table_config_${key}`, JSON.stringify(config));
};

export const loadTableConfig = (key: string): any | null => {
  const saved = localStorage.getItem(`table_config_${key}`);
  return saved ? JSON.parse(saved) : null;
};
