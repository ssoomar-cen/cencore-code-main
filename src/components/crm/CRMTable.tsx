import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, Pencil, Trash2, Download, Trash, ArrowUpDown, ArrowUp, ArrowDown, Edit } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkActionsToolbar } from "@/components/ui/bulk-actions-toolbar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface Column {
  header: string;
  accessor: string | ((row: any) => any);
}

interface CRMTableProps {
  data: any[];
  columns: Column[];
  onEdit?: (item: any) => void;
  onDelete?: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
  onBulkEdit?: (ids: string[], selectedItems: any[]) => void;
  onBulkMerge?: (ids: string[]) => void;
  onExport?: (rows: any[]) => void;
  idField: string;
  isLoading?: boolean;
  customActions?: (row: any) => React.ReactNode;
  onRecordClick?: (id: string) => void;
  emptyMessage?: string;
  manualPagination?: boolean;
  page?: number;
  pageSize?: number;
  totalRows?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export const CRMTable = ({
  data,
  columns,
  onEdit,
  onDelete,
  onBulkDelete,
  onBulkEdit,
  onBulkMerge,
  onExport,
  idField,
  isLoading = false,
  customActions,
  onRecordClick,
  emptyMessage = "No records found",
  manualPagination = false,
  page = 1,
  pageSize = 50,
  totalRows,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100, 200],
}: CRMTableProps) => {
  const isMobile = useIsMobile();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [isNarrowContainer, setIsNarrowContainer] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = React.useState<number | null>(null);
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');
  const useCardView = isMobile || isNarrowContainer;

  React.useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width ?? 0;
      setIsNarrowContainer(width > 0 && width < 900);
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map(row => row[idField])));
    }
  };

  const handleBulkDelete = () => {
    if (onBulkDelete && selectedIds.size > 0) {
      onBulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleBulkEdit = () => {
    if (onBulkEdit && selectedIds.size > 0) {
      const selectedItems = data.filter(row => selectedIds.has(row[idField]));
      onBulkEdit(Array.from(selectedIds), selectedItems);
    }
  };

  const handleExport = () => {
    if (onExport) {
      const selectedRows = data.filter(row => selectedIds.has(row[idField]));
      onExport(selectedRows.length > 0 ? selectedRows : data);
      setSelectedIds(new Set());
    }
  };

  const exportToCSV = (rows: any[]) => {
    if (rows.length === 0) return;

    // Get headers from columns
    const headers = columns.map(col => col.header);
    
    // Get data rows
    const csvData = rows.map(row => {
      return columns.map(column => {
        const value = typeof column.accessor === "function"
          ? column.accessor(row)
          : row[column.accessor];
        // Escape quotes and wrap in quotes if contains comma
        const stringValue = String(value || "");
        return stringValue.includes(",") || stringValue.includes('"')
          ? `"${stringValue.replace(/"/g, '""')}"`
          : stringValue;
      });
    });

    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.join(","))
    ].join("\n");

    // Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `export_${Date.now()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Default export handler if not provided
  const handleExportClick = () => {
    const selectedRows = data.filter(row => selectedIds.has(row[idField]));
    const rowsToExport = selectedRows.length > 0 ? selectedRows : data;
    
    if (onExport) {
      onExport(rowsToExport);
    } else {
      exportToCSV(rowsToExport);
    }
    setSelectedIds(new Set());
  };

  const handleSort = (columnIndex: number) => {
    if (sortColumn === columnIndex) {
      // Toggle direction if clicking same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to ascending
      setSortColumn(columnIndex);
      setSortDirection('asc');
    }
  };

  const sortedData = React.useMemo(() => {
    if (sortColumn === null) return data;

    const column = columns[sortColumn];
    const sorted = [...data].sort((a, b) => {
      let aVal = typeof column.accessor === "function" 
        ? column.accessor(a) 
        : a[column.accessor];
      let bVal = typeof column.accessor === "function" 
        ? column.accessor(b) 
        : b[column.accessor];

      // Handle null/undefined values
      if (aVal == null) aVal = "";
      if (bVal == null) bVal = "";

      // Convert to string for comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [data, sortColumn, sortDirection, columns]);

  const totalPages = manualPagination && totalRows !== undefined
    ? Math.max(1, Math.ceil(totalRows / pageSize))
    : 1;

  const renderPagination = manualPagination && totalRows !== undefined && onPageChange ? (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="text-sm text-muted-foreground">
        Showing page {page} of {totalPages} ({totalRows.toLocaleString()} records)
      </div>
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
            <SelectTrigger className="w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}/page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  ) : null;
  if (isLoading) {
    if (useCardView) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded" />
                <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              {columns.map((column, i) => (
                <TableHead key={i}>{column.header}</TableHead>
              ))}
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map((i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                </TableCell>
                {columns.map((_, j) => (
                  <TableCell key={j}>
                    <div className="h-4 bg-muted animate-pulse rounded" />
                  </TableCell>
                ))}
                <TableCell>
                  <div className="h-8 w-8 bg-muted animate-pulse rounded" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border rounded-md">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-4">
      <BulkActionsToolbar
        selectedCount={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onEdit={onBulkEdit ? handleBulkEdit : undefined}
        onDelete={onBulkDelete ? handleBulkDelete : undefined}
        onMerge={onBulkMerge ? () => onBulkMerge(Array.from(selectedIds)) : undefined}
        customActions={
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportClick}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        }
      />
      
      {useCardView ? (
        // Mobile Card View
        <div className="space-y-4">
          {sortedData.map((row) => (
            <Card key={row[idField]} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedIds.has(row[idField])}
                      onCheckedChange={() => toggleSelection(row[idField])}
                    />
                    <div 
                      onClick={() => onRecordClick?.(row[idField])}
                      className={onRecordClick ? "cursor-pointer" : ""}
                    >
                      <span className={onRecordClick ? "text-primary font-medium hover:underline" : "font-medium"}>
                        {typeof columns[0].accessor === "function"
                          ? columns[0].accessor(row)
                          : row[columns[0].accessor] || "-"}
                      </span>
                    </div>
                  </div>
                  {(onEdit || onDelete || customActions) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {customActions && customActions(row)}
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(row)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem
                            onClick={() => onDelete(row[idField])}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  {columns.slice(1).map((column, i) => {
                    const value = typeof column.accessor === "function"
                      ? column.accessor(row)
                      : row[column.accessor];
                    return (
                      <div key={i} className="flex justify-between gap-2">
                        <span className="text-muted-foreground font-medium">{column.header}:</span>
                        <span className="text-right">{value || "-"}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // Desktop Table View
        <div className="rounded-md border max-h-[calc(100vh-16rem)] overflow-y-auto overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <TableHeader className="sticky top-0 z-20 bg-background">
              <TableRow className="bg-background">
                <TableHead className="sticky top-0 z-20 w-[50px] bg-background">
                  <Checkbox
                    checked={selectedIds.size === data.length && data.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                {columns.map((column, i) => (
                  <TableHead key={i} className="sticky top-0 z-20 bg-background">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort(i)}
                      className="h-7 px-1.5 lg:px-2 hover:bg-transparent font-semibold"
                    >
                      {column.header}
                      {sortColumn === i ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="ml-1.5 h-3.5 w-3.5" />
                        ) : (
                          <ArrowDown className="ml-1.5 h-3.5 w-3.5" />
                        )
                      ) : (
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                ))}
                <TableHead className="sticky top-0 z-20 w-[50px] bg-background"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((row) => (
                <TableRow key={row[idField]}>
                  <TableCell className="py-1.5">
                    <Checkbox
                      checked={selectedIds.has(row[idField])}
                      onCheckedChange={() => toggleSelection(row[idField])}
                    />
                  </TableCell>
                  {columns.map((column, i) => {
                    const value = typeof column.accessor === "function"
                      ? column.accessor(row)
                      : row[column.accessor];
                    const isFirstColumn = i === 0;
                    return (
                      <TableCell 
                        key={i}
                        onClick={() => isFirstColumn && onRecordClick?.(row[idField])}
                        className={isFirstColumn && onRecordClick ? "cursor-pointer hover:underline text-primary" : ""}
                      >
                        {value || "-"}
                      </TableCell>
                    );
                  })}
                  <TableCell className="py-1.5">
                    {(onEdit || onDelete || customActions) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {customActions && customActions(row)}
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(row)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {onDelete && (
                            <DropdownMenuItem
                              onClick={() => onDelete(row[idField])}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </table>
        </div>
      )}
      {renderPagination}
    </div>
  );
};
