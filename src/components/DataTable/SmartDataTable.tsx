import { useState, useMemo } from 'react';
import { DataTable } from './DataTable';
import { ColumnDef, SortConfig, FilterConfig } from './types';
import { sortData, filterData } from '@/utils/tableUtils';

interface SmartDataTableProps<T extends Record<string, any>> {
  columns: ColumnDef<T>[];
  data: T[];
  searchKey?: string;
  initialPageSize?: number;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function SmartDataTable<T extends Record<string, any>>({
  columns,
  data,
  searchKey,
  initialPageSize = 10,
  onRowClick,
  emptyMessage = 'Ingen data å vise',
}: SmartDataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig[]>([]);
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Apply filtering and sorting
  const processedData = useMemo(() => {
    let result = [...data];
    
    // Apply filters
    result = filterData(result, filterConfig);
    
    // Apply sorting
    if (sortConfig.length > 0) {
      result = sortData(result, sortConfig);
    }
    
    return result;
  }, [data, filterConfig, sortConfig]);

  // Calculate pagination
  const totalPages = Math.ceil(processedData.length / pageSize);
  const paginatedData = processedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      const existing = prev.find((s) => s.key === key);
      
      if (!existing) {
        return [{ key, direction: 'asc' }];
      }
      
      if (existing.direction === 'asc') {
        return [{ key, direction: 'desc' }];
      }
      
      return prev.filter((s) => s.key !== key);
    });
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilterConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleReorderColumns = (oldIndex: number, newIndex: number) => {
    // Optional: implement column reordering if needed
    console.log('Reorder columns:', oldIndex, newIndex);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={paginatedData}
      onSort={handleSort}
      onFilterChange={handleFilterChange}
      onReorderColumns={handleReorderColumns}
      sortConfig={sortConfig}
      filterConfig={filterConfig}
      pageSize={pageSize}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={handlePageChange}
      onPageSizeChange={handlePageSizeChange}
      onRowClick={onRowClick}
    />
  );
}
