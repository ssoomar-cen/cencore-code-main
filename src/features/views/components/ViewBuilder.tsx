import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "../utils/useDebounce";
import { DataGrid } from "./DataGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Table2, Bookmark, Columns3, Filter, ArrowUpDown, Layers,
  FunctionSquare, Download, Save, ChevronDown, X, Plus,
  ChevronRight, Star, RefreshCw, ArrowUp, ArrowDown,
  Lock, Users, Globe, Trash2, BookmarkCheck,
} from "lucide-react";
import { useExportView, useSavedViews, useSaveView, useViewMetadata, useViewQuery } from "../hooks/useViewBuilder";
import { BaseEntity, ComputedField, FilterGroup, FilterRule, QueryRequest, ViewColumn } from "../types/viewBuilder";
import { cn } from "@/lib/utils";

interface ViewBuilderProps {
  entity: BaseEntity;
}

const ENTITY_OPTIONS: Array<{ value: BaseEntity; label: string; group: string }> = [
  { value: "opportunities", label: "Opportunities", group: "Sales" },
  { value: "leads", label: "Leads", group: "Sales" },
  { value: "quotes", label: "Quotes", group: "Sales" },
  { value: "commission_splits", label: "Commission Splits", group: "Sales" },
  { value: "accounts", label: "Organizations", group: "CRM" },
  { value: "contacts", label: "Contacts", group: "CRM" },
  { value: "connections", label: "Connections", group: "CRM" },
  { value: "projects", label: "Energy Programs", group: "Operations" },
  { value: "contracts", label: "Contracts", group: "Operations" },
  { value: "invoices", label: "Invoices", group: "Operations" },
  { value: "measures", label: "Measures", group: "Operations" },
  { value: "buildings", label: "Buildings", group: "Operations" },
  { value: "activities", label: "Activities", group: "Operations" },
];

const AGGS = ["count", "distinctCount", "sum", "avg", "min", "max", "median", "percentile25", "percentile50", "percentile75", "stddev"] as const;

const AGG_LABELS: Record<string, string> = {
  count: "Count", distinctCount: "Distinct Count", sum: "Sum", avg: "Average",
  min: "Min", max: "Max", median: "Median",
  percentile25: "25th %ile", percentile50: "50th %ile", percentile75: "75th %ile",
  stddev: "Std Dev",
};

const FILTER_OPS = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "contains", label: "contains" },
  { value: "gt", label: "greater than" },
  { value: "gte", label: "≥ greater or equal" },
  { value: "lt", label: "less than" },
  { value: "lte", label: "≤ less or equal" },
  { value: "between", label: "between" },
  { value: "isNull", label: "is blank" },
  { value: "notNull", label: "is not blank" },
] as const;

const defaultColumnByEntity: Record<BaseEntity, ViewColumn[]> = {
  opportunities: [
    { id: "name", path: "name", label: "Opportunity" },
    { id: "account_name", path: "account.name", label: "Account" },
    { id: "amount", path: "amount", label: "Amount" },
    { id: "probability", path: "probability", label: "Probability" },
    { id: "close_date", path: "close_date", label: "Close Date" },
  ],
  accounts: [
    { id: "name", path: "name", label: "Organization" },
    { id: "industry", path: "industry", label: "Industry" },
    { id: "region", path: "region", label: "Region" },
    { id: "status", path: "status", label: "Status" },
  ],
  contacts: [
    { id: "first_name", path: "first_name", label: "First Name" },
    { id: "last_name", path: "last_name", label: "Last Name" },
    { id: "email", path: "email", label: "Email" },
    { id: "account_name", path: "account.name", label: "Account" },
  ],
  projects: [
    { id: "name", path: "name", label: "Program Name" },
    { id: "account_name", path: "account.name", label: "Organization" },
    { id: "service_status", path: "service_status", label: "Service Status" },
    { id: "status", path: "status", label: "Status" },
    { id: "contract_start", path: "original_contract_start_date", label: "Contract Start" },
  ],
  leads: [
    { id: "first_name", path: "first_name", label: "First Name" },
    { id: "last_name", path: "last_name", label: "Last Name" },
    { id: "email", path: "email", label: "Email" },
    { id: "company", path: "company", label: "Company" },
    { id: "status", path: "status", label: "Status" },
    { id: "lead_source", path: "lead_source", label: "Lead Source" },
  ],
  quotes: [
    { id: "quote_number", path: "quote_number", label: "Quote #" },
    { id: "opportunity_name", path: "opportunity.name", label: "Opportunity" },
    { id: "quote_type", path: "quote_type", label: "Type" },
    { id: "status", path: "status", label: "Status" },
    { id: "total_amount", path: "total_amount", label: "Total Amount" },
    { id: "valid_until", path: "valid_until", label: "Valid Until" },
  ],
  contracts: [
    { id: "contract_number", path: "contract_number", label: "Contract #" },
    { id: "name", path: "name", label: "Name" },
    { id: "account_name", path: "account.name", label: "Account" },
    { id: "status", path: "status", label: "Status" },
    { id: "value", path: "value", label: "Value" },
    { id: "start_date", path: "start_date", label: "Start Date" },
    { id: "end_date", path: "end_date", label: "End Date" },
  ],
  invoices: [
    { id: "invoice_number", path: "invoice_number", label: "Invoice #" },
    { id: "account_name", path: "account.name", label: "Account" },
    { id: "contract_name", path: "contract.name", label: "Contract" },
    { id: "status", path: "status", label: "Status" },
    { id: "issue_date", path: "issue_date", label: "Issue Date" },
    { id: "due_date", path: "due_date", label: "Due Date" },
    { id: "invoice_total", path: "invoice_total", label: "Total" },
  ],
  measures: [
    { id: "name", path: "name", label: "Name" },
    { id: "account_name", path: "account.name", label: "Account" },
    { id: "conversion_date", path: "conversion_date", label: "Conversion Date" },
    { id: "conversion_bill_period", path: "conversion_bill_period", label: "Bill Period" },
  ],
  buildings: [
    { id: "name", path: "name", label: "Name" },
    { id: "building_no", path: "building_no", label: "Building #" },
    { id: "address_1", path: "address_1", label: "Address" },
    { id: "city", path: "city", label: "City" },
    { id: "state", path: "state", label: "State" },
    { id: "status", path: "status", label: "Status" },
    { id: "square_footage", path: "square_footage", label: "Sq Ft" },
  ],
  activities: [
    { id: "type", path: "type", label: "Type" },
    { id: "subject", path: "subject", label: "Subject" },
    { id: "status", path: "status", label: "Status" },
    { id: "priority", path: "priority", label: "Priority" },
    { id: "due_date", path: "due_date", label: "Due Date" },
    { id: "owner_first_name", path: "owner.first_name", label: "Owner First Name" },
    { id: "owner_last_name", path: "owner.last_name", label: "Owner Last Name" },
  ],
  connections: [
    { id: "account_name", path: "account.name", label: "Account" },
    { id: "contact_first_name", path: "contact.first_name", label: "Contact First Name" },
    { id: "contact_last_name", path: "contact.last_name", label: "Contact Last Name" },
    { id: "role", path: "role", label: "Role" },
    { id: "is_active", path: "is_active", label: "Active" },
    { id: "start_date", path: "start_date", label: "Start Date" },
  ],
  commission_splits: [
    { id: "name", path: "name", label: "Name" },
    { id: "contract_name", path: "contract.name", label: "Contract" },
    { id: "contact_first_name", path: "contact.first_name", label: "Recipient First Name" },
    { id: "contact_last_name", path: "contact.last_name", label: "Recipient Last Name" },
    { id: "commission_type", path: "commission_type", label: "Type" },
    { id: "status", path: "status", label: "Status" },
    { id: "commission_percent", path: "commission_percent", label: "Commission %" },
    { id: "total_commission_for_contract_term", path: "total_commission_for_contract_term", label: "Total Commission" },
  ],
};

const defaultFilter: FilterGroup = { op: "and", filters: [] };

function countRules(group: FilterGroup): number {
  return group.filters.reduce<number>((acc, f) => acc + ("filters" in f ? countRules(f) : 1), 0);
}

// ─── Recursive filter group editor ──────────────────────────────────────────
type FieldMeta = { path: string; label: string; type: string };

function FilterGroupEditor({
  group,
  onChange,
  onRemove,
  allFields,
  pathToLabel,
  depth = 0,
}: {
  group: FilterGroup;
  onChange: (g: FilterGroup) => void;
  onRemove?: () => void;
  allFields: FieldMeta[];
  pathToLabel: Map<string, string>;
  depth?: number;
}) {
  const [draftPath, setDraftPath] = useState("");
  const [draftOp, setDraftOp] = useState("eq");
  const [draftValue, setDraftValue] = useState("");
  const [fieldSearch, setFieldSearch] = useState("");

  const groupedFields = useMemo(() => {
    const filtered = fieldSearch.trim()
      ? allFields.filter(
          (f) =>
            f.label.toLowerCase().includes(fieldSearch.toLowerCase()) ||
            f.path.toLowerCase().includes(fieldSearch.toLowerCase())
        )
      : allFields;
    const out: Record<string, FieldMeta[]> = {};
    for (const f of filtered) {
      const key = f.path.includes(".") ? f.path.split(".")[0] : "Base";
      const title = key === "Base" ? "Base Fields" : key.charAt(0).toUpperCase() + key.slice(1) + " Fields";
      if (!out[title]) out[title] = [];
      out[title].push(f);
    }
    return out;
  }, [allFields, fieldSearch]);

  const updateChild = (idx: number, child: FilterGroup | FilterRule) => {
    const next = [...group.filters];
    next[idx] = child;
    onChange({ ...group, filters: next });
  };

  const removeChild = (idx: number) => {
    onChange({ ...group, filters: group.filters.filter((_, i) => i !== idx) });
  };

  const addRule = () => {
    if (!draftPath) return;
    const needsValue = !["isNull", "notNull"].includes(draftOp);
    if (needsValue && !draftValue.trim()) return;
    const value =
      draftOp === "between"
        ? draftValue.split(",").map((v) => v.trim())
        : needsValue
        ? draftValue
        : undefined;
    onChange({
      ...group,
      filters: [...group.filters, { path: draftPath, op: draftOp as FilterRule["op"], value }],
    });
    setDraftPath("");
    setDraftValue("");
    setFieldSearch("");
  };

  const addSubGroup = () => {
    onChange({ ...group, filters: [...group.filters, { op: "and", filters: [] }] });
  };

  const bgClass = depth === 0 ? "bg-muted/20" : depth === 1 ? "bg-primary/5" : "bg-orange-50/40 dark:bg-orange-950/20";
  const borderClass = depth === 0 ? "border-border" : depth === 1 ? "border-primary/20" : "border-orange-300/30";

  return (
    <div className={cn("rounded-lg border", bgClass, borderClass)}>
      {/* Group header: AND / OR toggle */}
      <div className={cn("flex items-center gap-2 px-3 py-2 border-b", borderClass)}>
        <div className="flex rounded border overflow-hidden text-[11px] font-semibold">
          <button
            type="button"
            className={cn(
              "px-2.5 py-1 transition-colors",
              group.op === "and" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
            onClick={() => onChange({ ...group, op: "and" })}
          >
            ALL (AND)
          </button>
          <button
            type="button"
            className={cn(
              "px-2.5 py-1 transition-colors",
              group.op === "or" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
            onClick={() => onChange({ ...group, op: "or" })}
          >
            ANY (OR)
          </button>
        </div>
        <span className="text-xs text-muted-foreground">of the following</span>
        {onRemove && (
          <button
            type="button"
            className="ml-auto rounded p-0.5 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="p-2 space-y-1.5">
        {/* Existing rules and sub-groups */}
        {group.filters.length === 0 && (
          <p className="py-3 text-center text-xs text-muted-foreground">No conditions yet — add one below</p>
        )}

        {group.filters.map((filter, idx) => {
          if ("filters" in filter) {
            return (
              <FilterGroupEditor
                key={idx}
                group={filter}
                onChange={(updated) => updateChild(idx, updated)}
                onRemove={() => removeChild(idx)}
                allFields={allFields}
                pathToLabel={pathToLabel}
                depth={depth + 1}
              />
            );
          }
          const rule = filter;
          const opLabel = FILTER_OPS.find((o) => o.value === rule.op)?.label ?? rule.op;
          return (
            <div key={idx} className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
              <div className="flex flex-1 min-w-0 flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="text-xs font-normal shrink-0">
                  {pathToLabel.get(rule.path) ?? rule.path}
                </Badge>
                <span className="text-xs text-muted-foreground shrink-0">{opLabel}</span>
                {rule.value !== undefined && (
                  <Badge variant="secondary" className="text-xs font-normal max-w-[180px] truncate">
                    {Array.isArray(rule.value) ? rule.value.join(" – ") : String(rule.value)}
                  </Badge>
                )}
              </div>
              <button
                type="button"
                className="flex-shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
                onClick={() => removeChild(idx)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}

        {/* Add rule form */}
        <div className="rounded-lg border border-dashed p-2.5 space-y-2 mt-1">
          {/* Field picker with inline search */}
          <div className="space-y-1">
            <Input
              value={fieldSearch}
              onChange={(e) => setFieldSearch(e.target.value)}
              placeholder="Search fields…"
              className="h-7 text-xs"
            />
            <Select value={draftPath} onValueChange={setDraftPath}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Choose field…" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {Object.entries(groupedFields).map(([groupName, fields]) => (
                  <React.Fragment key={groupName}>
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50">
                      {groupName}
                    </div>
                    {fields.map((f) => (
                      <SelectItem key={f.path} value={f.path}>
                        <span>{f.label}</span>
                        <span className="ml-2 text-[10px] text-muted-foreground/60">{f.type}</span>
                      </SelectItem>
                    ))}
                  </React.Fragment>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Select value={draftOp} onValueChange={setDraftOp}>
              <SelectTrigger className="h-8 w-40 shrink-0 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILTER_OPS.map((op) => (
                  <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!["isNull", "notNull"].includes(draftOp) && (
              <Input
                className="h-8 flex-1 text-sm"
                placeholder={draftOp === "between" ? "min, max" : "Value…"}
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addRule()}
              />
            )}
          </div>

          <div className="flex gap-2">
            <Button size="sm" className="flex-1 gap-1" onClick={addRule} disabled={!draftPath}>
              <Plus className="h-3 w-3" /> Add Rule
            </Button>
            {depth < 2 && (
              <Button size="sm" variant="outline" className="gap-1 shrink-0" onClick={addSubGroup}>
                <Plus className="h-3 w-3" /> Add Group
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Toolbar icon button with optional badge ────────────────────────────────
function ToolBtn({
  icon,
  label,
  onClick,
  active,
  count,
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  count?: number;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className={[
            "relative flex h-8 w-8 items-center justify-center rounded-md transition-colors",
            active
              ? "bg-primary/10 text-primary ring-1 ring-primary/30"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
            className,
          ].join(" ")}
        >
          {icon}
          {count !== undefined && count > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-bold text-primary-foreground">
              {count}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────
export function ViewBuilder({ entity }: ViewBuilderProps) {
  const navigate = useNavigate();

  // Core view state
  const [columns, setColumns] = useState<ViewColumn[]>(defaultColumnByEntity[entity]);
  const [groupBy, setGroupBy] = useState<string[]>([]);
  const [sortPath, setSortPath] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [totals, setTotals] = useState(true);
  const [filters, setFilters] = useState<FilterGroup>(defaultFilter);
  const [computed, setComputed] = useState<ComputedField[]>([]);
  const [autoApply, setAutoApply] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [queryKey, setQueryKey] = useState(0);

  // Save state
  const [viewName, setViewName] = useState("");
  const [viewDescription, setViewDescription] = useState("");
  const [sharing, setSharing] = useState<"PRIVATE" | "TEAM" | "ORG">("PRIVATE");
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);

  // Panel open states
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [formulaOpen, setFormulaOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  // Columns sheet local state
  const [fieldSearch, setFieldSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ Base: true });

  // Formula local state
  const [formulaLabel, setFormulaLabel] = useState("");
  const [formulaExpr, setFormulaExpr] = useState("");

  const debouncedColumns = useDebounce(columns, 250);
  const debouncedFilters = useDebounce(filters, 300);

  const metadataQuery = useViewMetadata(entity);
  const savedViewsQuery = useSavedViews(entity);
  const saveMutations = useSaveView();
  const exportMutation = useExportView();

  const payload: QueryRequest = useMemo(
    () => ({
      baseEntity: entity,
      columns: debouncedColumns,
      filters: debouncedFilters.filters.length ? debouncedFilters : undefined,
      sorts: sortPath ? [{ path: sortPath, dir: sortDir }] : undefined,
      groupBy: groupBy.length ? groupBy : undefined,
      computed: computed.length ? computed : undefined,
      pagination: { page, pageSize },
      totals,
    }),
    [computed, debouncedColumns, debouncedFilters, entity, groupBy, page, pageSize, sortDir, sortPath, totals]
  );

  const query = useViewQuery(payload, autoApply || queryKey > 0);

  useEffect(() => {
    setColumns(defaultColumnByEntity[entity]);
    setGroupBy([]);
    setSortPath("");
    setFilters(defaultFilter);
    setComputed([]);
    setSelectedViewId(null);
    setViewName("");
    setViewDescription("");
  }, [entity]);

  // ── Derived field data ──────────────────────────────────────────────────
  const allFields = metadataQuery.data?.fields ?? [];

  const pathToLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const field of allFields) map.set(field.path, field.label);
    return map;
  }, [allFields]);

  const groupedFields = useMemo(() => {
    const filtered = fieldSearch.trim()
      ? allFields.filter(
          (f) =>
            f.label.toLowerCase().includes(fieldSearch.toLowerCase()) ||
            f.path.toLowerCase().includes(fieldSearch.toLowerCase())
        )
      : allFields;

    type FieldItem = { path: string; label: string; type: string };
    const grouped: Record<string, FieldItem[]> = {};
    for (const field of filtered) {
      const key = field.path.includes(".") ? field.path.split(".")[0] : "Base";
      const title = key === "Base" ? "Base" : key.charAt(0).toUpperCase() + key.slice(1);
      if (!grouped[title]) grouped[title] = [];
      grouped[title].push(field);
    }
    return grouped;
  }, [allFields, fieldSearch]);

  useEffect(() => {
    setExpandedGroups((prev) => {
      const next = { ...prev };
      for (const name of Object.keys(groupedFields)) {
        if (next[name] === undefined) next[name] = true;
      }
      return next;
    });
  }, [groupedFields]);

  // ── Column helpers ──────────────────────────────────────────────────────
  const isFieldSelected = (path: string) => columns.some((c) => c.path === path);

  const toggleField = (path: string, label: string) => {
    if (isFieldSelected(path)) {
      setColumns((prev) => prev.filter((c) => c.path !== path));
    } else {
      const idBase = path.split(".").join("_");
      const id = columns.some((c) => c.id === idBase) ? `${idBase}_${columns.length + 1}` : idBase;
      setColumns((prev) => [...prev, { id, path, label }]);
    }
  };

  const moveColumn = (index: number, direction: "up" | "down") => {
    setColumns((prev) => {
      const next = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return next;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const updateColumn = (id: string, patch: Partial<ViewColumn>) => {
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  // ── Filter helpers ──────────────────────────────────────────────────────
  const activeFilterCount = countRules(filters);

  // ── Group helpers ───────────────────────────────────────────────────────
  const addGroupBy = (path: string) => {
    setGroupBy((prev) => (prev.includes(path) ? prev : [...prev, path]));
  };

  // ── Formula helpers ─────────────────────────────────────────────────────
  const addComputed = () => {
    if (!formulaLabel.trim() || !formulaExpr.trim()) return;
    const id = formulaLabel.toLowerCase().replace(/\s+/g, "_");
    setComputed((prev) => [...prev, { id, label: formulaLabel, expression: formulaExpr }]);
    setColumns((prev) => [...prev, { id, path: id, label: formulaLabel }]);
    setFormulaLabel("");
    setFormulaExpr("");
  };

  // ── Save/load view ──────────────────────────────────────────────────────
  const saveView = async () => {
    if (!viewName.trim()) { toast.error("View name is required"); return; }
    try {
      if (selectedViewId) {
        await saveMutations.updateView({ id: selectedViewId, baseEntity: entity, name: viewName, description: viewDescription, scope: sharing, definition: payload });
        toast.success("View updated");
      } else {
        const created = await saveMutations.createView({ baseEntity: entity, name: viewName, description: viewDescription, scope: sharing, definition: payload });
        setSelectedViewId(created.id);
        toast.success("View saved");
      }
      setSaveOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const applySavedView = (viewId: string) => {
    const view = savedViewsQuery.data?.find((v) => v.id === viewId);
    if (!view) return;
    setSelectedViewId(view.id);
    setViewName(view.name);
    setViewDescription(view.description ?? "");
    setSharing(view.scope);
    setColumns(view.definition.columns);
    setFilters(view.definition.filters ?? defaultFilter);
    setGroupBy(view.definition.groupBy ?? []);
    setComputed(view.definition.computed ?? []);
    setSortPath(view.definition.sorts?.[0]?.path ?? "");
    setSortDir(view.definition.sorts?.[0]?.dir ?? "asc");
    setTotals(view.definition.totals ?? true);
    setPage(1);
    setQueryKey((v) => v + 1);
  };

  const currentEntity = ENTITY_OPTIONS.find((e) => e.value === entity);
  const currentView = savedViewsQuery.data?.find((v) => v.id === selectedViewId);

  const scopeIcon = { PRIVATE: <Lock className="h-3 w-3" />, TEAM: <Users className="h-3 w-3" />, ORG: <Globe className="h-3 w-3" /> };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex h-[calc(100vh-4rem)] flex-col gap-2 p-3">

        {/* ── Toolbar ── */}
        <div className="flex flex-shrink-0 items-center gap-1 rounded-xl border bg-card/90 px-2 py-1 shadow-sm">

          {/* Entity selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                <Table2 className="h-4 w-4 text-muted-foreground" />
                <span>{currentEntity?.label ?? entity}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              {Array.from(new Set(ENTITY_OPTIONS.map((o) => o.group))).map((group) => (
                <React.Fragment key={group}>
                  <DropdownMenuSeparator className="first:hidden" />
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</div>
                  {ENTITY_OPTIONS.filter((o) => o.group === group).map((opt) => (
                    <DropdownMenuItem key={opt.value} onClick={() => navigate(`/views/${opt.value}`)}>
                      {opt.value === entity && <span className="mr-2 h-1.5 w-1.5 rounded-full bg-primary inline-block" />}
                      {opt.label}
                    </DropdownMenuItem>
                  ))}
                </React.Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Saved views */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-8 items-center gap-1.5 rounded-md px-2 text-sm transition-colors hover:bg-muted"
              >
                {currentView ? (
                  <BookmarkCheck className="h-4 w-4 text-primary" />
                ) : (
                  <Bookmark className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="max-w-[120px] truncate text-sm text-muted-foreground">
                  {currentView?.name ?? "Saved Views"}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {(savedViewsQuery.data ?? []).length === 0 ? (
                <div className="px-2 py-3 text-center text-xs text-muted-foreground">No saved views yet</div>
              ) : (
                (savedViewsQuery.data ?? []).map((view) => (
                  <DropdownMenuItem
                    key={view.id}
                    className="flex items-center gap-2"
                    onClick={() => applySavedView(view.id)}
                  >
                    <span className="flex-1 truncate">{view.name}</span>
                    <span className="text-muted-foreground">{scopeIcon[view.scope]}</span>
                    {view.starred && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setViewName(""); setViewDescription(""); setSelectedViewId(null); setSaveOpen(true); }}>
                <Plus className="mr-2 h-3.5 w-3.5" /> Save current view…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="mx-0.5 h-5" />

          {/* Columns */}
          <ToolBtn
            icon={<Columns3 className="h-4 w-4" />}
            label="Columns"
            active={true}
            count={columns.length}
            onClick={() => setColumnsOpen(true)}
          />

          {/* Filters */}
          <ToolBtn
            icon={<Filter className="h-4 w-4" />}
            label={activeFilterCount ? `Filters (${activeFilterCount})` : "Filters"}
            active={activeFilterCount > 0}
            count={activeFilterCount || undefined}
            onClick={() => setFiltersOpen(true)}
          />

          {/* Sort */}
          <Popover open={sortOpen} onOpenChange={setSortOpen}>
            <PopoverTrigger asChild>
              <span>
                <ToolBtn
                  icon={<ArrowUpDown className="h-4 w-4" />}
                  label="Sort"
                  active={!!sortPath}
                />
              </span>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sort</p>
              <div className="space-y-2">
                <Select value={sortPath || "__none__"} onValueChange={(v) => setSortPath(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Sort by…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No sorting</SelectItem>
                    {allFields.map((f) => (
                      <SelectItem key={f.path} value={f.path}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={sortDir === "asc" ? "default" : "outline"}
                    className="flex-1 gap-1.5"
                    onClick={() => setSortDir("asc")}
                  >
                    <ArrowUp className="h-3.5 w-3.5" /> Ascending
                  </Button>
                  <Button
                    size="sm"
                    variant={sortDir === "desc" ? "default" : "outline"}
                    className="flex-1 gap-1.5"
                    onClick={() => setSortDir("desc")}
                  >
                    <ArrowDown className="h-3.5 w-3.5" /> Descending
                  </Button>
                </div>
                {sortPath && (
                  <Button size="sm" variant="ghost" className="w-full text-xs" onClick={() => setSortPath("")}>
                    <X className="mr-1.5 h-3 w-3" /> Clear sort
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Group by */}
          <Popover open={groupOpen} onOpenChange={setGroupOpen}>
            <PopoverTrigger asChild>
              <span>
                <ToolBtn
                  icon={<Layers className="h-4 w-4" />}
                  label="Group By"
                  active={groupBy.length > 0}
                  count={groupBy.length || undefined}
                />
              </span>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Group By</p>
              {groupBy.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {groupBy.map((path) => (
                    <Badge key={path} variant="secondary" className="gap-1 pr-1 text-xs">
                      {pathToLabel.get(path) ?? path}
                      <button
                        type="button"
                        aria-label={`Remove ${pathToLabel.get(path) ?? path} grouping`}
                        className="ml-0.5 rounded opacity-60 hover:opacity-100"
                        onClick={() => setGroupBy((prev) => prev.filter((p) => p !== path))}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <Select onValueChange={(v) => addGroupBy(v)} value="">
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Add group by field…" />
                </SelectTrigger>
                <SelectContent>
                  {allFields
                    .filter((f) => !groupBy.includes(f.path))
                    .map((f) => (
                      <SelectItem key={f.path} value={f.path}>{f.label}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <div className="mt-3 flex items-center justify-between rounded-lg border px-3 py-2">
                <span className="text-sm">Show totals row</span>
                <Switch checked={totals} onCheckedChange={setTotals} />
              </div>
              {groupBy.length > 0 && (
                <Button size="sm" variant="ghost" className="mt-2 w-full text-xs" onClick={() => setGroupBy([])}>
                  <X className="mr-1.5 h-3 w-3" /> Clear all groups
                </Button>
              )}
            </PopoverContent>
          </Popover>

          {/* Computed / Formula */}
          <ToolBtn
            icon={<FunctionSquare className="h-4 w-4" />}
            label="Computed Fields"
            active={computed.length > 0}
            count={computed.length || undefined}
            onClick={() => setFormulaOpen(true)}
          />

          <Separator orientation="vertical" className="mx-0.5 h-5" />

          {/* Auto-apply + manual apply */}
          <div className="flex items-center gap-1.5 rounded-md border px-2 py-1">
            <span className="text-xs text-muted-foreground">Auto</span>
            <Switch checked={autoApply} onCheckedChange={setAutoApply} className="scale-75" />
          </div>
          {!autoApply && (
            <Button size="sm" variant="default" className="h-8 gap-1.5 text-xs" onClick={() => setQueryKey((v) => v + 1)}>
              <RefreshCw className="h-3.5 w-3.5" /> Run
            </Button>
          )}

          {/* Right-side actions */}
          <div className="ml-auto flex items-center gap-1">
            {/* Export */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Export data"
                  className="flex h-8 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Download className="h-4 w-4" />
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem onClick={() => exportMutation.mutate({ type: "csv", payload })}>
                  Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportMutation.mutate({ type: "xlsx", payload })}>
                  Export Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Save */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors hover:bg-muted"
                  onClick={() => setSaveOpen(true)}
                >
                  <Save className="h-4 w-4 text-muted-foreground" />
                  {selectedViewId ? (
                    <span className="text-xs text-muted-foreground">Update</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Save</span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Save / share view</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="mx-0.5 h-5" />

            {/* Pagination */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={page <= 1}
                onClick={() => setPage((v) => Math.max(1, v - 1))}
              >
                ‹
              </Button>
              <span className="min-w-[2.5rem] text-center text-xs text-muted-foreground">
                {page} / {Math.ceil((query.data?.pageInfo.totalRows ?? 0) / pageSize) || "…"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setPage((v) => v + 1)}
              >
                ›
              </Button>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-7 w-20 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[25, 50, 100, 200].map((s) => (
                    <SelectItem key={s} value={String(s)}>{s} / pg</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ── Data Grid ── */}
        <DataGrid
          columns={columns}
          result={query.data}
          isLoading={query.isLoading || query.isFetching}
          conditionalRules={[{ path: "amount", op: "gt", value: 100000, color: "bg-emerald-50 dark:bg-emerald-950/30" }]}
        />

        {query.isError && (
          <Alert variant="destructive">
            <AlertDescription>{(query.error as Error)?.message || "Failed to load data."}</AlertDescription>
          </Alert>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            COLUMNS SHEET — two-pane: field picker + selected columns
        ═══════════════════════════════════════════════════════════════════ */}
        <Sheet open={columnsOpen} onOpenChange={setColumnsOpen}>
          <SheetContent side="right" className="flex w-[680px] max-w-full flex-col gap-0 p-0 sm:max-w-[680px]">
            <SheetHeader className="border-b px-5 py-4">
              <SheetTitle className="flex items-center gap-2">
                <Columns3 className="h-4 w-4" /> Columns
                <Badge variant="secondary" className="ml-1">{columns.length} selected</Badge>
              </SheetTitle>
            </SheetHeader>

            <div className="flex min-h-0 flex-1">
              {/* Left: Available fields */}
              <div className="flex w-56 flex-shrink-0 flex-col border-r">
                <div className="border-b p-3">
                  <Input
                    value={fieldSearch}
                    onChange={(e) => setFieldSearch(e.target.value)}
                    placeholder="Search fields…"
                    className="h-8 text-sm"
                  />
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    {Object.entries(groupedFields).map(([groupName, fields]) => (
                      <div key={groupName}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-1 rounded px-2 py-1 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted/60"
                          onClick={() => setExpandedGroups((p) => ({ ...p, [groupName]: !p[groupName] }))}
                        >
                          <ChevronRight
                            className={`h-3 w-3 transition-transform ${expandedGroups[groupName] ? "rotate-90" : ""}`}
                          />
                          {groupName}
                          <span className="ml-auto text-[10px] opacity-50">{fields.length}</span>
                        </button>
                        {expandedGroups[groupName] && (
                          <div className="ml-1 space-y-0.5 border-l pl-2 pb-1">
                            {fields.map((field) => (
                              <label
                                key={field.path}
                                className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-muted"
                              >
                                <Checkbox
                                  checked={isFieldSelected(field.path)}
                                  onCheckedChange={() => toggleField(field.path, field.label)}
                                  className="h-3.5 w-3.5"
                                />
                                <span className="flex-1 truncate">{field.label}</span>
                                <span className="text-[10px] text-muted-foreground/50">{field.type}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Related tables */}
                    {(metadataQuery.data?.relations ?? []).length > 0 && (
                      <div className="mt-2 rounded-lg border border-dashed p-2">
                        <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Related Tables</p>
                        {(metadataQuery.data?.relations ?? []).map((r) => (
                          <div key={r.name} className="px-1 py-0.5 text-xs text-muted-foreground">
                            {r.name} → {r.toEntity}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Right: Selected columns */}
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="border-b px-4 py-2.5">
                  <div className="grid grid-cols-[1fr_1fr_80px_70px_64px_32px] gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <span>Label</span>
                    <span>Field</span>
                    <span>Aggregate</span>
                    <span>Width</span>
                    <span>Pin</span>
                    <span />
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="space-y-0.5 p-3">
                    {columns.length === 0 ? (
                      <div className="py-10 text-center text-sm text-muted-foreground">
                        Select fields from the left panel
                      </div>
                    ) : (
                      columns.map((col, idx) => (
                        <div
                          key={col.id}
                          className="grid grid-cols-[1fr_1fr_80px_70px_64px_32px] items-center gap-2 rounded-lg px-1 py-1 hover:bg-muted/40"
                        >
                          {/* Label */}
                          <Input
                            className="h-7 text-xs"
                            value={col.label ?? pathToLabel.get(col.path) ?? col.path}
                            onChange={(e) => updateColumn(col.id, { label: e.target.value })}
                          />
                          {/* Field path */}
                          <Select
                            value={col.path}
                            onValueChange={(v) => {
                              const lbl = pathToLabel.get(v) ?? v;
                              updateColumn(col.id, { path: v, label: lbl });
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {allFields.map((f) => (
                                <SelectItem key={f.path} value={f.path}>{f.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {/* Aggregation */}
                          <Select
                            value={col.aggregation ?? "none"}
                            onValueChange={(v) => updateColumn(col.id, { aggregation: v === "none" ? undefined : (v as any) })}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {AGGS.map((a) => (
                                <SelectItem key={a} value={a}>{AGG_LABELS[a]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {/* Width */}
                          <Input
                            type="number"
                            className="h-7 text-xs"
                            value={col.width ?? 180}
                            onChange={(e) => updateColumn(col.id, { width: Number(e.target.value) })}
                          />
                          {/* Pin */}
                          <Select
                            value={col.pin ?? "none"}
                            onValueChange={(v) => updateColumn(col.id, { pin: v === "none" ? undefined : (v as "left" | "right") })}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">—</SelectItem>
                              <SelectItem value="left">Left</SelectItem>
                              <SelectItem value="right">Right</SelectItem>
                            </SelectContent>
                          </Select>
                          {/* Actions */}
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              aria-label="Move column up"
                              disabled={idx === 0}
                              className="flex h-3 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-20"
                              onClick={() => moveColumn(idx, "up")}
                            >
                              <ArrowUp className="h-2.5 w-2.5" />
                            </button>
                            <button
                              type="button"
                              aria-label="Move column down"
                              disabled={idx === columns.length - 1}
                              className="flex h-3 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-20"
                              onClick={() => moveColumn(idx, "down")}
                            >
                              <ArrowDown className="h-2.5 w-2.5" />
                            </button>
                          </div>
                          <button
                            type="button"
                            aria-label={`Remove column ${col.label ?? col.path}`}
                            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setColumns((prev) => prev.filter((c) => c.id !== col.id))}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
                <div className="border-t px-4 py-2.5 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => setColumns((prev) => prev.map((c) => ({ ...c, width: 180 })))}
                  >
                    Reset widths
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-destructive hover:text-destructive"
                    onClick={() => setColumns([])}
                  >
                    Clear all
                  </Button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* ══════════════════════════════════════════════════════════════════
            FILTERS SHEET
        ═══════════════════════════════════════════════════════════════════ */}
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetContent side="right" className="flex w-[520px] max-w-full flex-col gap-0 p-0 sm:max-w-[520px]">
            <SheetHeader className="border-b px-5 py-4">
              <SheetTitle className="flex items-center gap-2">
                <Filter className="h-4 w-4" /> Filters
                {activeFilterCount > 0 && (
                  <Badge className="ml-1">{activeFilterCount} {activeFilterCount === 1 ? "rule" : "rules"}</Badge>
                )}
              </SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Build conditions across base and related table fields. Nest groups for complex logic.
              </p>
            </SheetHeader>

            <ScrollArea className="flex-1 px-4">
              <div className="py-4">
                <FilterGroupEditor
                  group={filters}
                  onChange={setFilters}
                  allFields={allFields}
                  pathToLabel={pathToLabel}
                  depth={0}
                />
              </div>
            </ScrollArea>

            {activeFilterCount > 0 && (
              <div className="border-t p-4">
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full text-xs text-destructive hover:text-destructive"
                  onClick={() => setFilters(defaultFilter)}
                >
                  <X className="mr-1.5 h-3 w-3" /> Clear all filters
                </Button>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* ══════════════════════════════════════════════════════════════════
            COMPUTED FIELDS SHEET
        ═══════════════════════════════════════════════════════════════════ */}
        <Sheet open={formulaOpen} onOpenChange={setFormulaOpen}>
          <SheetContent side="right" className="flex w-[440px] max-w-full flex-col gap-0 p-0 sm:max-w-[440px]">
            <SheetHeader className="border-b px-5 py-4">
              <SheetTitle className="flex items-center gap-2">
                <FunctionSquare className="h-4 w-4" /> Computed Fields
              </SheetTitle>
            </SheetHeader>

            <ScrollArea className="flex-1 px-5">
              <div className="space-y-4 py-4">
                {computed.length === 0 ? (
                  <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
                    No computed fields added
                  </div>
                ) : (
                  <div className="space-y-2">
                    {computed.map((f) => (
                      <div key={f.id} className="flex items-start justify-between gap-2 rounded-xl border bg-muted/30 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{f.label}</p>
                          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{f.expression}</p>
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove computed field ${f.label}`}
                          className="flex-shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            setComputed((prev) => prev.filter((c) => c.id !== f.id));
                            setColumns((prev) => prev.filter((c) => c.id !== f.id));
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-xl border p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">New computed field</p>
                  <Input
                    placeholder="Field label"
                    className="h-8 text-sm"
                    value={formulaLabel}
                    onChange={(e) => setFormulaLabel(e.target.value)}
                  />
                  <Textarea
                    placeholder="Expression — e.g. amount * probability"
                    className="resize-none text-sm font-mono"
                    rows={3}
                    value={formulaExpr}
                    onChange={(e) => setFormulaExpr(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Functions: <code className="rounded bg-muted px-1">concat(a, b)</code>,{" "}
                    <code className="rounded bg-muted px-1">daysUntil(close_date)</code>.
                    Use dot paths like <code className="rounded bg-muted px-1">account.name</code>.
                  </p>
                  <Button
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={addComputed}
                    disabled={!formulaLabel.trim() || !formulaExpr.trim()}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add field
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>

        {/* ══════════════════════════════════════════════════════════════════
            SAVE / SHARE SHEET
        ═══════════════════════════════════════════════════════════════════ */}
        <Sheet open={saveOpen} onOpenChange={setSaveOpen}>
          <SheetContent side="right" className="flex w-[400px] max-w-full flex-col gap-0 p-0 sm:max-w-[400px]">
            <SheetHeader className="border-b px-5 py-4">
              <SheetTitle className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {selectedViewId ? "Update View" : "Save View"}
              </SheetTitle>
            </SheetHeader>

            <ScrollArea className="flex-1 px-5">
              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">View Name</Label>
                  <Input
                    placeholder="e.g. High-Value Opportunities Q1"
                    className="text-sm"
                    value={viewName}
                    onChange={(e) => setViewName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Description <span className="text-muted-foreground">(optional)</span></Label>
                  <Textarea
                    placeholder="Describe what this view shows…"
                    className="resize-none text-sm"
                    rows={3}
                    value={viewDescription}
                    onChange={(e) => setViewDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Visibility</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["PRIVATE", "TEAM", "ORG"] as const).map((scope) => (
                      <button
                        key={scope}
                        type="button"
                        className={[
                          "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs transition-colors",
                          sharing === scope
                            ? "border-primary bg-primary/5 text-primary"
                            : "text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground",
                        ].join(" ")}
                        onClick={() => setSharing(scope)}
                      >
                        {scope === "PRIVATE" && <Lock className="h-4 w-4" />}
                        {scope === "TEAM" && <Users className="h-4 w-4" />}
                        {scope === "ORG" && <Globe className="h-4 w-4" />}
                        <span>{scope === "PRIVATE" ? "Private" : scope === "TEAM" ? "Team" : "Org"}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary of what will be saved */}
                <div className="rounded-xl bg-muted/50 p-3 space-y-1.5 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">View summary</p>
                  <p>{columns.length} columns · {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""}</p>
                  {sortPath && <p>Sorted by {pathToLabel.get(sortPath) ?? sortPath} ({sortDir})</p>}
                  {groupBy.length > 0 && <p>Grouped by {groupBy.map((p) => pathToLabel.get(p) ?? p).join(", ")}</p>}
                  {computed.length > 0 && <p>{computed.length} computed field{computed.length !== 1 ? "s" : ""}</p>}
                </div>
              </div>
            </ScrollArea>

            <div className="border-t p-4 space-y-2">
              <Button
                className="w-full"
                onClick={saveView}
                disabled={saveMutations.isSaving || !viewName.trim()}
              >
                {saveMutations.isSaving ? "Saving…" : selectedViewId ? "Update View" : "Save View"}
              </Button>
              {selectedViewId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-destructive hover:text-destructive"
                  onClick={async () => {
                    try {
                      await saveMutations.deleteView(selectedViewId);
                      setSelectedViewId(null);
                      setViewName("");
                      setSaveOpen(false);
                      toast.success("View deleted");
                    } catch (err) {
                      toast.error((err as Error).message);
                    }
                  }}
                >
                  <Trash2 className="mr-1.5 h-3 w-3" /> Delete this view
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
