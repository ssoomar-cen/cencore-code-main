import { useMemo, useRef } from "react";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { QueryResponse, ViewColumn } from "../types/viewBuilder";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface DataGridProps {
  columns: ViewColumn[];
  result?: QueryResponse;
  isLoading: boolean;
  locale?: string;
}

const fmtNumber = (value: unknown, locale: string) => {
  if (typeof value !== "number") return value;
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
};

export function DataGrid({ columns, result, isLoading, locale = "en-US" }: DataGridProps) {
  const rows = result?.rows ?? [];
  const containerRef = useRef<HTMLDivElement>(null);

  const tableColumns = useMemo(
    () =>
      columns.map((column) => ({
        id: column.id,
        accessorFn: (row: Record<string, unknown>) => row[column.id] ?? row[column.path],
        header: column.label ?? column.path,
        size: column.width ?? 180,
        cell: ({ getValue }: { getValue: () => unknown }) => {
          const value = getValue();
          if (value === null || value === undefined || value === "") return <span className="text-muted-foreground">—</span>;
          if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
            return new Intl.DateTimeFormat(locale).format(new Date(value));
          }
          return String(fmtNumber(value, locale));
        },
      })),
    [columns, locale]
  );

  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">No data found</p>
          <p className="text-sm">Try adjusting your filters or columns</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="overflow-auto flex-1 border rounded-md" style={{ maxHeight: "calc(100vh - 220px)" }}>
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-3 py-2.5 text-left font-medium text-muted-foreground border-b whitespace-nowrap"
                  style={{ width: header.getSize() }}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = table.getRowModel().rows[virtualRow.index];
            if (!row) return null;
            return (
              <tr key={row.id} className="border-b hover:bg-muted/30 transition-colors">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2 whitespace-nowrap" style={{ width: cell.column.getSize() }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {result?.pageInfo && (
        <div className="sticky bottom-0 bg-muted/60 backdrop-blur border-t px-3 py-1.5 text-xs text-muted-foreground">
          {result.pageInfo.totalRows.toLocaleString()} total rows
        </div>
      )}
    </div>
  );
}
