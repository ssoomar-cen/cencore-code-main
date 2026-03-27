import * as React from "react";
import { cn } from "@/lib/utils";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

export interface Column<T> {
  id: string;
  header: string;
  accessor: (item: T) => React.ReactNode;
  sortAccessor?: (item: T) => string | number | Date | null | undefined;
  className?: string;
  minWidth?: number;
  defaultWidth?: number;
  align?: "left" | "center" | "right";
  sortable?: boolean;
}

interface ResizableSortableTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyAccessor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  className?: string;
  defaultSortColumn?: string;
  defaultSortDirection?: "asc" | "desc";
  // Selection props
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
}

export function ResizableSortableTable<T>({
  data,
  columns,
  keyAccessor,
  onRowClick,
  emptyMessage = "No data available",
  className,
  defaultSortColumn,
  defaultSortDirection = "asc",
  selectable = false,
  selectedIds = [],
  onSelectionChange,
}: ResizableSortableTableProps<T>) {
  const [sortColumn, setSortColumn] = React.useState<string | null>(defaultSortColumn || null);
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">(defaultSortDirection);
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>(() => {
    const widths: Record<string, number> = {};
    if (selectable) {
      widths["__checkbox"] = 48;
    }
    columns.forEach((col) => {
      widths[col.id] = col.defaultWidth || 150;
    });
    return widths;
  });
  const [resizing, setResizing] = React.useState<string | null>(null);
  const startXRef = React.useRef<number>(0);
  const startWidthRef = React.useRef<number>(0);

  const handleSort = (columnId: string) => {
    const column = columns.find((c) => c.id === columnId);
    if (column?.sortable === false) return;
    
    if (sortColumn === columnId) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(columnId);
      setSortDirection("asc");
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortColumn) return data;
    
    const column = columns.find((c) => c.id === sortColumn);
    if (!column) return data;

    return [...data].sort((a, b) => {
      const aVal = column.sortAccessor ? column.sortAccessor(a) : column.accessor(a);
      const bVal = column.sortAccessor ? column.sortAccessor(b) : column.accessor(b);
      
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let comparison = 0;
      if (aVal instanceof Date && bVal instanceof Date) {
        comparison = aVal.getTime() - bVal.getTime();
      } else if (typeof aVal === "number" && typeof bVal === "number") {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection, columns]);

  const handleResizeStart = (
    e: React.MouseEvent | React.TouchEvent,
    columnId: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(columnId);
    startXRef.current = "touches" in e ? e.touches[0].clientX : e.clientX;
    startWidthRef.current = columnWidths[columnId] || 150;
  };

  // Selection handlers
  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    const allIds = data.map(keyAccessor);
    if (selectedIds.length === data.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(allIds);
    }
  };

  const handleSelectRow = (id: string) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  React.useEffect(() => {
    if (!resizing) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const diff = clientX - startXRef.current;
      const minWidth = resizing === "__checkbox" ? 48 : 60;
      const newWidth = Math.max(minWidth, startWidthRef.current + diff);
      
      setColumnWidths((prev) => ({
        ...prev,
        [resizing]: newWidth,
      }));
    };

    const handleEnd = () => {
      setResizing(null);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchmove", handleMove);
    document.addEventListener("touchend", handleEnd);

    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [resizing]);

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const ResizeHandle = ({ columnId }: { columnId: string }) => (
    <div
      className={cn(
        "absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 transition-colors",
        resizing === columnId && "bg-primary"
      )}
      onMouseDown={(e) => handleResizeStart(e, columnId)}
      onTouchStart={(e) => handleResizeStart(e, columnId)}
      onClick={(e) => e.stopPropagation()}
    />
  );

  return (
    <div className={cn("overflow-x-auto", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead
                style={{ width: columnWidths["__checkbox"], minWidth: 48 }}
                className="relative select-none"
              >
                <Checkbox
                  checked={data.length > 0 && selectedIds.length === data.length}
                  onCheckedChange={handleSelectAll}
                />
                <ResizeHandle columnId="__checkbox" />
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead
                key={column.id}
                style={{ width: columnWidths[column.id], minWidth: column.minWidth || 60 }}
                className={cn(
                  "relative select-none",
                  column.sortable !== false && "cursor-pointer hover:bg-muted/50",
                  column.align === "right" && "text-right",
                  column.align === "center" && "text-center",
                  column.className
                )}
                onClick={() => column.sortable !== false && handleSort(column.id)}
              >
                <div className={cn(
                  "flex items-center gap-1",
                  column.align === "right" && "justify-end",
                  column.align === "center" && "justify-center"
                )}>
                  <span>{column.header}</span>
                  {column.sortable !== false && (
                    <span className="text-muted-foreground">
                      {sortColumn === column.id ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </span>
                  )}
                </div>
                <ResizeHandle columnId={column.id} />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((item) => {
            const id = keyAccessor(item);
            const isSelected = selectedIds.includes(id);
            return (
              <TableRow
                key={id}
                className={cn(
                  onRowClick && "cursor-pointer",
                  "hover:bg-muted/50",
                  isSelected && "bg-muted"
                )}
                onClick={() => onRowClick?.(item)}
              >
                {selectable && (
                  <TableCell
                    style={{ width: columnWidths["__checkbox"], minWidth: 48 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSelectRow(id)}
                    />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    style={{ width: columnWidths[column.id], minWidth: column.minWidth || 60 }}
                    className={cn(
                      column.align === "right" && "text-right",
                      column.align === "center" && "text-center",
                      column.className
                    )}
                  >
                    {column.accessor(item)}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
