import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { TableBlock as TableBlockType } from '../schemas/experience.schema';

interface TableBlockProps extends TableBlockType {
  onAction?: (actionId: string) => void;
}

export const TableBlock = ({ title, columns, rows }: TableBlockProps) => {
  // Guard: If columns or rows is undefined or empty, show fallback
  if (!columns || columns.length === 0 || !rows || rows.length === 0) {
    return (
      <div className="space-y-4">
        {title && <h2 className="text-2xl font-bold text-primary">{title}</h2>}
        <p className="text-muted-foreground">Ingen data å vise</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {title && <h2 className="text-2xl font-bold text-primary">{title}</h2>}
      <div className="border border-primary/20 rounded-lg overflow-hidden bg-surface">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/10">
              {columns.map((column, index) => (
                <TableHead key={index} className="text-primary font-semibold">{column}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={rowIndex} className="text-on-surface">
                {row.map((cell, cellIndex) => (
                  <TableCell key={cellIndex}>{cell}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
