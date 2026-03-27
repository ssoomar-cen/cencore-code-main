import { useMemo, useRef } from "react";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { QueryResponse, ViewColumn } from "../types/viewBuilder";
import { Badge } from "@/components/ui/badge";

interface DataGridProps {
  columns: ViewColumn[];
  result?: QueryResponse;
  isLoading: boolean;
  locale?: string;
  conditionalRules?: Array<{ path: string; op: "gt" | "lt" | "eq"; value: number; color: string }>;
}

const fmtNumber = (value: unknown, locale: string) => {
  if (typeof value !== "number") return value;
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
};

export function DataGrid({ columns, result, isLoading, locale = "en-US", conditionalRules = [] }: DataGridProps) {
  const rows = result?.rows ?? [];
  const containerRef = useRef<HTMLDivElement>(null);

  const tableColumns = useMemo(
    () =>
      columns.map((column) => ({
        id: column.id,
        accessorFn: (row: Record<string, unknown>) => row[column.id],
        header: column.label ?? column.path,
        size: column.width ?? 180,
        cell: ({ getValue }: { getValue: () => unknown }) => {
          const value = getValue();
          if (value === null || value === undefined || value === "") return <span className="text-muted-foreground">-</span>;
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
    overscan: 8,
  });

  const virtualItems = virtualizer.getVirtualItems();

  const highlightClass = (row: Record<string, unknown>) => {
    for (const rule of conditionalRules) {
      const raw = row[rule.path];
      if (typeof raw !== "number") continue;
      if (rule.op === "gt" && raw > rule.value) return rule.color;
      if (rule.op === "lt" && raw < rule.value) return rule.color;
      if (rule.op === "eq" && raw === rule.value) return rule.color;
    }
    return "";
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card/70 shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{result?.pageInfo.totalRows ?? 0} rows</Badge>
          <span>{result?.diagnostics.executionMs ?? 0} ms</span>
        </div>
        {result?.diagnostics.warnings?.[0] ? <span>{result.diagnostics.warnings[0]}</span> : null}
      </div>

      <div className="grid grid-cols-1 border-b bg-muted/30 text-sm font-medium" style={{ gridTemplateColumns: columns.map((c) => `${c.width ?? 180}px`).join(" ") }}>
        {table.getHeaderGroups()[0]?.headers.map((header) => (
          <div key={header.id} className="truncate border-r px-3 py-2 last:border-r-0" title={String(header.column.columnDef.header)}>
            {flexRender(header.column.columnDef.header, header.getContext())}
          </div>
        ))}
      </div>

      <div ref={containerRef} className="relative flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading list data...</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No rows match the current view definition.</div>
        ) : (
          <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
            {virtualItems.map((item) => {
              const row = table.getRowModel().rows[item.index];
              return (
                <div
                  key={row.id}
                  className={`absolute left-0 top-0 grid w-full border-b text-sm ${highlightClass(row.original as Record<string, unknown>)}`}
                  style={{
                    transform: `translateY(${item.start}px)`,
                    gridTemplateColumns: columns.map((c) => `${c.width ?? 180}px`).join(" "),
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <div key={cell.id} className="truncate border-r px-3 py-2 last:border-r-0" title={String(cell.getValue() ?? "")}> 
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {result?.summaries.grandTotals && Object.keys(result.summaries.grandTotals).length > 0 ? (
        <div className="border-t bg-muted/20 px-4 py-2 text-xs">
          Totals: {Object.entries(result.summaries.grandTotals).map(([key, value]) => `${key}: ${String(value)}`).join(" | ")}
        </div>
      ) : null}
    </div>
  );
}