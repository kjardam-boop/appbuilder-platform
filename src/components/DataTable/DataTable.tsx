import { ReactNode, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, ArrowUp, ArrowDown, GripVertical, Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ColumnDef, SortConfig, FilterConfig } from './types';

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  onSort: (key: string) => void;
  onFilterChange: (key: string, value: any) => void;
  onReorderColumns: (oldIndex: number, newIndex: number) => void;
  sortConfig: SortConfig[];
  filterConfig: FilterConfig;
  pageSize: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onRowClick?: (row: T) => void;
}

interface DraggableHeaderProps {
  column: ColumnDef<any>;
  sortConfig: SortConfig[];
  onSort: (key: string) => void;
  onFilterChange: (key: string, value: any) => void;
  filterValue: any;
}

function DraggableHeader({
  column,
  sortConfig,
  onSort,
  onFilterChange,
  filterValue,
}: DraggableHeaderProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.key,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sortState = sortConfig.find((s) => s.key === column.key);

  return (
    <TableHead
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group',
        column.sticky === 'left' && 'sticky left-0 z-10 bg-card',
        column.sticky === 'right' && 'sticky right-0 z-10 bg-card'
      )}
    >
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        {column.sortable ? (
          <button
            onClick={() => onSort(column.key)}
            className="flex items-center gap-2 hover:text-primary transition-colors"
          >
            <span className="font-medium">{column.label}</span>
            {sortState ? (
              sortState.direction === 'asc' ? (
                <ArrowUp className="h-4 w-4" />
              ) : (
                <ArrowDown className="h-4 w-4" />
              )
            ) : (
              <ArrowUpDown className="h-4 w-4 opacity-50" />
            )}
          </button>
        ) : (
          <span className="font-medium">{column.label}</span>
        )}
      </div>
      {column.filterable && (
        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
          {column.type === 'text' && (
            <Input
              placeholder={`Filter ${column.label.toLowerCase()}...`}
              value={(filterValue as string) || ''}
              onChange={(e) => onFilterChange(column.key, e.target.value || null)}
              className="h-8 text-xs"
            />
          )}
          {column.type === 'select' && column.filterOptions && (
            <>
              {column.multiSelect ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-8 w-full justify-start text-xs font-normal">
                      {Array.isArray(filterValue) && filterValue.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {filterValue.slice(0, 2).map((val) => {
                            const option = column.filterOptions?.find(opt => String(opt.value) === String(val));
                            return (
                              <Badge key={String(val)} variant="secondary" className="text-xs px-1 py-0">
                                {option?.label || val}
                              </Badge>
                            );
                          })}
                          {filterValue.length > 2 && (
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              +{filterValue.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Velg...</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-2 bg-background" align="start">
                    <div className="space-y-2">
                      {Array.isArray(filterValue) && filterValue.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-full text-xs"
                          onClick={() => onFilterChange(column.key, null)}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Fjern alle
                        </Button>
                      )}
                      {column.filterOptions.map((option) => {
                        const isChecked = Array.isArray(filterValue) && filterValue.includes(String(option.value));
                        return (
                          <div key={String(option.value)} className="flex items-center gap-2">
                            <Checkbox
                              id={`${column.key}-${option.value}`}
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                const currentValues = Array.isArray(filterValue) ? filterValue : [];
                                const newValues = checked
                                  ? [...currentValues, String(option.value)]
                                  : currentValues.filter(v => v !== String(option.value));
                                onFilterChange(column.key, newValues.length > 0 ? newValues : null);
                              }}
                            />
                            <label
                              htmlFor={`${column.key}-${option.value}`}
                              className="text-xs cursor-pointer flex-1"
                            >
                              {option.label}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <Select
                  value={(filterValue as string) || 'all'}
                  onValueChange={(value) => onFilterChange(column.key, value === 'all' ? null : value)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Alle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    {column.filterOptions.map((option) => (
                      <SelectItem key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </>
          )}
          {column.type === 'date' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-8 w-full justify-start text-xs font-normal">
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {filterValue?.from ? (
                    filterValue.to ? (
                      <>
                        {format(new Date(filterValue.from), 'dd.MM.yy')} -{' '}
                        {format(new Date(filterValue.to), 'dd.MM.yy')}
                      </>
                    ) : (
                      format(new Date(filterValue.from), 'dd.MM.yyyy')
                    )
                  ) : (
                    <span>Velg dato</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={filterValue}
                  onSelect={(range) => onFilterChange(column.key, range || null)}
                  locale={nb}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}
    </TableHead>
  );
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  onSort,
  onFilterChange,
  onReorderColumns,
  sortConfig,
  filterConfig,
  pageSize,
  currentPage,
  totalPages,
  onPageChange,
  onPageSizeChange,
  onRowClick,
}: DataTableProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const visibleColumns = columns.filter((col) => col.visible !== false);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = visibleColumns.findIndex((col) => col.key === active.id);
      const newIndex = visibleColumns.findIndex((col) => col.key === over.id);
      onReorderColumns(oldIndex, newIndex);
    }
  };

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = data.slice(startIndex, endIndex);

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-card">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableContext items={visibleColumns.map((col) => col.key)} strategy={horizontalListSortingStrategy}>
                  {visibleColumns.map((column) => (
                    <DraggableHeader
                      key={column.key}
                      column={column}
                      sortConfig={sortConfig}
                      onSort={onSort}
                      onFilterChange={onFilterChange}
                      filterValue={filterConfig[column.key]}
                    />
                  ))}
                </SortableContext>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length} className="h-24 text-center">
                    Ingen resultater funnet.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, rowIndex) => (
                  <TableRow
                    key={rowIndex}
                    onClick={() => onRowClick?.(row)}
                    className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                  >
                    {visibleColumns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn(
                          column.sticky === 'left' && 'sticky left-0 z-10 bg-card',
                          column.sticky === 'right' && 'sticky right-0 z-10 bg-card'
                        )}
                        style={{ width: column.width }}
                      >
                        {column.render ? column.render(row[column.key], row) : row[column.key]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rader per side:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            Viser {startIndex + 1}-{Math.min(endIndex, data.length)} av {data.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Forrige
          </Button>
          <span className="text-sm text-muted-foreground">
            Side {currentPage} av {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Neste
          </Button>
        </div>
      </div>
    </div>
  );
}
