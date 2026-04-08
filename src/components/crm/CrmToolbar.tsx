import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, List, LayoutGrid } from "lucide-react";

export interface FilterConfig {
  key: string;
  label: string;
  options: { label: string; value: string }[];
}

interface CrmToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  filters: FilterConfig[];
  filterValues: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  view: "list" | "kanban";
  onViewChange: (v: "list" | "kanban") => void;
  showKanban: boolean;
  recordCount: number;
  createLabel: string;
  onCreateClick: () => void;
  extraActions?: React.ReactNode;
}

export function CrmToolbar({
  search, onSearchChange, filters, filterValues, onFilterChange,
  view, onViewChange, showKanban, recordCount,
  createLabel, onCreateClick, extraActions,
}: CrmToolbarProps) {
  return (
    <div className="flex flex-col gap-2 sm:gap-3">
      {/* Row 1: Search + Filters (scrollable on mobile) */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-shrink-0 w-full sm:w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
          {filters.map((f) => (
            <Select
              key={f.key}
              value={filterValues[f.key] || "all"}
              onValueChange={(v) => onFilterChange(f.key, v)}
            >
              <SelectTrigger className="min-w-[120px] sm:w-40 h-9 flex-shrink-0">
                <SelectValue placeholder={f.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {f.label}</SelectItem>
                {f.options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>
      </div>

      {/* Row 2: Actions bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="secondary" className="text-xs">{recordCount} records</Badge>

        <div className="flex-1" />

        {/* View toggle */}
        {showKanban && (
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={view === "list" ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-8 px-2.5 sm:px-3 gap-1 text-xs"
              onClick={() => onViewChange("list")}
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">List</span>
            </Button>
            <Button
              variant={view === "kanban" ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-8 px-2.5 sm:px-3 gap-1 text-xs"
              onClick={() => onViewChange("kanban")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Board</span>
            </Button>
          </div>
        )}

        {extraActions}
        <Button onClick={onCreateClick} size="sm" className="h-8 text-xs gap-1">
          <Plus className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{createLabel}</span><span className="sm:hidden">New</span>
        </Button>
      </div>
    </div>
  );
}
