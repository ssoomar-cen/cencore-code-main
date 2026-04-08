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
  
  { value: "contracts", label: "Contracts", group: "Operations" },
  { value: "invoices", label: "Invoices", group: "Operations" },
  { value: "measures", label: "Measures", group: "Operations" },
  { value: "buildings", label: "Buildings", group: "Operations" },
  { value: "activities", label: "Activities", group: "Operations" },
];

const AGGS = ["count", "distinctCount", "sum", "avg", "min", "max"] as const;

const AGG_LABELS: Record<string, string> = {
  count: "Count", distinctCount: "Distinct", sum: "Sum", avg: "Average", min: "Min", max: "Max",
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

const defaultColumnByEntity: Record<string, ViewColumn[]> = {
  opportunities: [
    { id: "name", path: "name", label: "Opportunity" },
    { id: "accounts_name", path: "accounts.name", label: "Account" },
    { id: "amount", path: "amount", label: "Amount" },
    { id: "probability", path: "probability", label: "Probability" },
    { id: "stage", path: "stage", label: "Stage" },
    { id: "close_date", path: "close_date", label: "Close Date" },
  ],
  accounts: [
    { id: "name", path: "name", label: "Organization" },
    { id: "industry", path: "industry", label: "Industry" },
    { id: "account_type", path: "account_type", label: "Type" },
    { id: "status", path: "status", label: "Status" },
  ],
  contacts: [
    { id: "first_name", path: "first_name", label: "First Name" },
    { id: "last_name", path: "last_name", label: "Last Name" },
    { id: "email", path: "email", label: "Email" },
    { id: "accounts_name", path: "accounts.name", label: "Account" },
  ],
  leads: [
    { id: "first_name", path: "first_name", label: "First Name" },
    { id: "last_name", path: "last_name", label: "Last Name" },
    { id: "email", path: "email", label: "Email" },
    { id: "company", path: "company", label: "Company" },
    { id: "status", path: "status", label: "Status" },
  ],
  quotes: [
    { id: "quote_number", path: "quote_number", label: "Quote #" },
    { id: "name", path: "name", label: "Name" },
    { id: "status", path: "status", label: "Status" },
    { id: "total", path: "total", label: "Total" },
    { id: "valid_until", path: "valid_until", label: "Valid Until" },
  ],
  contracts: [
    { id: "contract_number", path: "contract_number", label: "Contract #" },
    { id: "name", path: "name", label: "Name" },
    { id: "accounts_name", path: "accounts.name", label: "Account" },
    { id: "status", path: "status", label: "Status" },
    { id: "value", path: "value", label: "Value" },
  ],
  invoices: [
    { id: "invoice_number", path: "invoice_number", label: "Invoice #" },
    { id: "accounts_name", path: "accounts.name", label: "Account" },
    { id: "status", path: "status", label: "Status" },
    { id: "total", path: "total", label: "Total" },
    { id: "due_date", path: "due_date", label: "Due Date" },
  ],
  measures: [
    { id: "name", path: "name", label: "Name" },
    { id: "accounts_name", path: "accounts.name", label: "Account" },
    { id: "measure_type", path: "measure_type", label: "Type" },
    { id: "status", path: "status", label: "Status" },
  ],
  buildings: [
    { id: "name", path: "name", label: "Name" },
    { id: "building_type", path: "building_type", label: "Type" },
    { id: "address_city", path: "address_city", label: "City" },
    { id: "address_state", path: "address_state", label: "State" },
    { id: "status", path: "status", label: "Status" },
  ],
  activities: [
    { id: "subject", path: "subject", label: "Subject" },
    { id: "activity_type", path: "activity_type", label: "Type" },
    { id: "status", path: "status", label: "Status" },
    { id: "priority", path: "priority", label: "Priority" },
    { id: "due_date", path: "due_date", label: "Due Date" },
  ],
  connections: [
    { id: "relationship_type", path: "relationship_type", label: "Relationship" },
    { id: "notes", path: "notes", label: "Notes" },
    { id: "created_at", path: "created_at", label: "Created" },
  ],
  commission_splits: [
    { id: "sales_rep_name", path: "sales_rep_name", label: "Sales Rep" },
    { id: "opportunities_name", path: "opportunities.name", label: "Opportunity" },
    { id: "split_percentage", path: "split_percentage", label: "Split %" },
    { id: "amount", path: "amount", label: "Amount" },
    { id: "status", path: "status", label: "Status" },
  ],
};

const defaultFilter: FilterGroup = { op: "and", filters: [] };

function countRules(group: FilterGroup): number {
  return group.filters.reduce((acc, f) => acc + ("filters" in f ? countRules(f as FilterGroup) : 1), 0);
}

// ─── Recursive filter group editor ──────────────────────────────────────────
type FieldMeta = { path: string; label: string; type: string };

function FilterGroupEditor({
  group, onChange, onRemove, allFields, pathToLabel, depth = 0,
}: {
  group: FilterGroup; onChange: (g: FilterGroup) => void; onRemove?: () => void;
  allFields: FieldMeta[]; pathToLabel: Map<string, string>; depth?: number;
}) {
  const [draftPath, setDraftPath] = useState("");
  const [draftOp, setDraftOp] = useState("eq");
  const [draftValue, setDraftValue] = useState("");

  const updateChild = (idx: number, child: FilterGroup | FilterRule) => {
    const next = [...group.filters]; next[idx] = child; onChange({ ...group, filters: next });
  };
  const removeChild = (idx: number) => {
    onChange({ ...group, filters: group.filters.filter((_, i) => i !== idx) });
  };
  const addRule = () => {
    if (!draftPath) return;
    const needsValue = !["isNull", "notNull"].includes(draftOp);
    if (needsValue && !draftValue.trim()) return;
    const value = draftOp === "between" ? draftValue.split(",").map((v) => v.trim()) : needsValue ? draftValue : undefined;
    onChange({ ...group, filters: [...group.filters, { path: draftPath, op: draftOp as FilterRule["op"], value }] });
    setDraftPath(""); setDraftValue("");
  };
  const addSubGroup = () => { onChange({ ...group, filters: [...group.filters, { op: "and", filters: [] }] }); };

  const bgClass = depth === 0 ? "bg-muted/20" : depth === 1 ? "bg-primary/5" : "bg-accent/20";

  return (
    <div className={cn("border rounded-lg p-3 space-y-3", bgClass)}>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-md overflow-hidden border">
          <button className={cn("px-2 py-1 text-xs font-medium transition-colors", group.op === "and" ? "bg-primary text-primary-foreground" : "hover:bg-muted")} onClick={() => onChange({ ...group, op: "and" })}>ALL (AND)</button>
          <button className={cn("px-2 py-1 text-xs font-medium transition-colors", group.op === "or" ? "bg-primary text-primary-foreground" : "hover:bg-muted")} onClick={() => onChange({ ...group, op: "or" })}>ANY (OR)</button>
        </div>
        <span className="text-xs text-muted-foreground">of the following</span>
        {onRemove && <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={onRemove}><X className="h-3 w-3" /></Button>}
      </div>

      {group.filters.length === 0 && <p className="text-xs text-muted-foreground italic">No conditions yet — add one below</p>}

      {group.filters.map((filter, idx) => {
        if ("filters" in filter) {
          return <FilterGroupEditor key={idx} group={filter as FilterGroup} onChange={(updated) => updateChild(idx, updated)} onRemove={() => removeChild(idx)} allFields={allFields} pathToLabel={pathToLabel} depth={depth + 1} />;
        }
        const rule = filter as FilterRule;
        const opLabel = FILTER_OPS.find((o) => o.value === rule.op)?.label ?? rule.op;
        return (
          <div key={idx} className="flex items-center gap-2 text-sm flex-wrap">
            <Badge variant="outline">{pathToLabel.get(rule.path) ?? rule.path}</Badge>
            <Badge variant="secondary">{opLabel}</Badge>
            {rule.value !== undefined && <Badge>{Array.isArray(rule.value) ? (rule.value as string[]).join(" – ") : String(rule.value)}</Badge>}
            <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => removeChild(idx)}><X className="h-3 w-3" /></Button>
          </div>
        );
      })}

      <div className="flex items-end gap-2 flex-wrap">
        <Select value={draftPath} onValueChange={setDraftPath}>
          <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Field…" /></SelectTrigger>
          <SelectContent>{allFields.map((f) => <SelectItem key={f.path} value={f.path}>{f.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={draftOp} onValueChange={setDraftOp}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{FILTER_OPS.map((op) => <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>)}</SelectContent>
        </Select>
        {!["isNull", "notNull"].includes(draftOp) && (
          <Input className="w-32 h-8 text-xs" placeholder="Value…" value={draftValue} onChange={(e) => setDraftValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addRule()} />
        )}
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={addRule}><Plus className="h-3 w-3 mr-1" />Add Rule</Button>
        {depth < 2 && <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={addSubGroup}>Add Group</Button>}
      </div>
    </div>
  );
}

// ─── Toolbar icon button with optional badge ────────────────────────────────
function ToolBtn({ icon, label, onClick, active, count, className = "" }: {
  icon: React.ReactNode; label: string; onClick?: () => void; active?: boolean; count?: number; className?: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={onClick} className={cn("relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md text-xs transition-colors", active ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground hover:text-foreground", className)}>
            {icon}
            {count !== undefined && count > 0 && <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center">{count}</span>}
          </button>
        </TooltipTrigger>
        <TooltipContent><p>{label}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────
export function ViewBuilder({ entity }: ViewBuilderProps) {
  const navigate = useNavigate();

  const [columns, setColumns] = useState<ViewColumn[]>(defaultColumnByEntity[entity] || []);
  const [groupBy, setGroupBy] = useState<string[]>([]);
  const [sortPath, setSortPath] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [totals, setTotals] = useState(true);
  const [filters, setFilters] = useState<FilterGroup>(defaultFilter);
  const [computed, setComputed] = useState<ComputedField[]>([]);
  const [autoApply, setAutoApply] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [queryKey, setQueryKey] = useState(0);

  const [viewName, setViewName] = useState("");
  const [viewDescription, setViewDescription] = useState("");
  const [sharing, setSharing] = useState<"PRIVATE" | "TEAM" | "ORG">("PRIVATE");
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);

  const [columnsOpen, setColumnsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [formulaOpen, setFormulaOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  const [fieldSearch, setFieldSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ Base: true });

  const [formulaLabel, setFormulaLabel] = useState("");
  const [formulaExpr, setFormulaExpr] = useState("");

  const debouncedColumns = useDebounce(columns, 250);
  const debouncedFilters = useDebounce(filters, 300);

  const metadataQuery = useViewMetadata(entity);
  const savedViewsQuery = useSavedViews(entity);
  const saveMutations = useSaveView();
  const exportMutation = useExportView();

  const payload: QueryRequest = useMemo(() => ({
    baseEntity: entity,
    columns: debouncedColumns,
    filters: debouncedFilters.filters.length ? debouncedFilters : undefined,
    sorts: sortPath ? [{ path: sortPath, dir: sortDir }] : undefined,
    groupBy: groupBy.length ? groupBy : undefined,
    computed: computed.length ? computed : undefined,
    pagination: { page, pageSize },
    totals,
  }), [computed, debouncedColumns, debouncedFilters, entity, groupBy, page, pageSize, sortDir, sortPath, totals]);

  const query = useViewQuery(payload, autoApply || queryKey > 0);

  useEffect(() => {
    setColumns(defaultColumnByEntity[entity] || []);
    setGroupBy([]); setSortPath(""); setFilters(defaultFilter);
    setComputed([]); setSelectedViewId(null); setViewName(""); setViewDescription("");
  }, [entity]);

  const allFields = metadataQuery.data?.fields ?? [];
  const pathToLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const field of allFields) map.set(field.path, field.label);
    return map;
  }, [allFields]);

  const groupedFields = useMemo(() => {
    const filtered = fieldSearch.trim()
      ? allFields.filter((f) => f.label.toLowerCase().includes(fieldSearch.toLowerCase()) || f.path.toLowerCase().includes(fieldSearch.toLowerCase()))
      : allFields;
    const grouped: Record<string, FieldMeta[]> = {};
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

  const activeFilterCount = countRules(filters);

  const addComputed = () => {
    if (!formulaLabel.trim() || !formulaExpr.trim()) return;
    const id = formulaLabel.toLowerCase().replace(/\s+/g, "_");
    setComputed((prev) => [...prev, { id, label: formulaLabel, expression: formulaExpr }]);
    setColumns((prev) => [...prev, { id, path: id, label: formulaLabel }]);
    setFormulaLabel(""); setFormulaExpr("");
  };

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
    } catch (err) { toast.error((err as Error).message); }
  };

  const applySavedView = (viewId: string) => {
    const view = savedViewsQuery.data?.find((v) => v.id === viewId);
    if (!view) return;
    setSelectedViewId(view.id); setViewName(view.name); setViewDescription(view.description ?? "");
    setSharing(view.scope); setColumns(view.definition.columns);
    setFilters(view.definition.filters ?? defaultFilter);
    setGroupBy(view.definition.groupBy ?? []); setComputed(view.definition.computed ?? []);
    setSortPath(view.definition.sorts?.[0]?.path ?? ""); setSortDir(view.definition.sorts?.[0]?.dir ?? "asc");
    setTotals(view.definition.totals ?? true); setPage(1); setQueryKey((v) => v + 1);
  };

  const currentEntity = ENTITY_OPTIONS.find((e) => e.value === entity);
  const currentView = savedViewsQuery.data?.find((v) => v.id === selectedViewId);
  const scopeIcon = { PRIVATE: <Lock className="h-3 w-3" />, TEAM: <Users className="h-3 w-3" />, ORG: <Globe className="h-3 w-3" /> };

  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1 p-2 border-b bg-card flex-wrap">
        {/* Entity selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1 text-xs sm:text-sm">
              <Table2 className="h-4 w-4" />
              <span className="hidden sm:inline">{currentEntity?.label ?? entity}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {Array.from(new Set(ENTITY_OPTIONS.map((o) => o.group))).map((group) => (
              <React.Fragment key={group}>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="text-xs font-semibold text-muted-foreground">{group}</DropdownMenuItem>
                {ENTITY_OPTIONS.filter((o) => o.group === group).map((opt) => (
                  <DropdownMenuItem key={opt.value} onClick={() => navigate(`/views/${opt.value}`)}>
                    {opt.value === entity && <ChevronRight className="h-3 w-3 mr-1" />}
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
            <Button variant="outline" size="sm" className="gap-1 text-xs">
              {currentView ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              <span className="hidden sm:inline">{currentView?.name ?? "Saved Views"}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {(savedViewsQuery.data ?? []).length === 0 ? (
              <DropdownMenuItem disabled><span className="text-xs text-muted-foreground italic">No saved views yet</span></DropdownMenuItem>
            ) : (
              (savedViewsQuery.data ?? []).map((view) => (
                <DropdownMenuItem key={view.id} onClick={() => applySavedView(view.id)}>
                  {view.name} {scopeIcon[view.scope]}
                  {view.starred && <Star className="h-3 w-3 ml-auto fill-yellow-400 text-yellow-400" />}
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { setViewName(""); setViewDescription(""); setSelectedViewId(null); setSaveOpen(true); }}>
              <Save className="h-3 w-3 mr-2" />Save current view…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Columns */}
        <ToolBtn icon={<Columns3 className="h-4 w-4" />} label="Columns" active count={columns.length} onClick={() => setColumnsOpen(true)} />

        {/* Filters */}
        <ToolBtn icon={<Filter className="h-4 w-4" />} label={activeFilterCount ? `Filters (${activeFilterCount})` : "Filters"} active={activeFilterCount > 0} count={activeFilterCount || undefined} onClick={() => setFiltersOpen(true)} />

        {/* Sort */}
        <Popover>
          <PopoverTrigger asChild>
            <div><ToolBtn icon={<ArrowUpDown className="h-4 w-4" />} label="Sort" active={!!sortPath} /></div>
          </PopoverTrigger>
          <PopoverContent className="w-64 space-y-3" align="start">
            <p className="text-sm font-medium">Sort</p>
            <Select value={sortPath || "__none__"} onValueChange={(v) => setSortPath(v === "__none__" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No sorting</SelectItem>
                {allFields.map((f) => <SelectItem key={f.path} value={f.path}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button size="sm" variant={sortDir === "asc" ? "default" : "outline"} className="flex-1 text-xs" onClick={() => setSortDir("asc")}>
                <ArrowUp className="h-3 w-3 mr-1" />Ascending
              </Button>
              <Button size="sm" variant={sortDir === "desc" ? "default" : "outline"} className="flex-1 text-xs" onClick={() => setSortDir("desc")}>
                <ArrowDown className="h-3 w-3 mr-1" />Descending
              </Button>
            </div>
            {sortPath && <Button size="sm" variant="ghost" className="w-full text-xs" onClick={() => setSortPath("")}>Clear sort</Button>}
          </PopoverContent>
        </Popover>

        {/* Computed / Formula */}
        <ToolBtn icon={<FunctionSquare className="h-4 w-4" />} label="Computed Fields" active={computed.length > 0} count={computed.length || undefined} onClick={() => setFormulaOpen(true)} />

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Auto-apply + manual apply */}
        <div className="flex items-center gap-1.5">
          <Switch checked={autoApply} onCheckedChange={setAutoApply} className="scale-75" />
          <span className="text-[10px] text-muted-foreground">Auto</span>
        </div>
        {!autoApply && (
          <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => setQueryKey((v) => v + 1)}>
            <RefreshCw className="h-3 w-3" />Run
          </Button>
        )}

        {/* Right side actions */}
        <div className="ml-auto flex items-center gap-1">
          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1"><Download className="h-3 w-3" />Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => exportMutation.mutate({ type: "csv", payload })}>Export CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Save */}
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setSaveOpen(true)}>
            <Save className="h-3 w-3" />{selectedViewId ? "Update" : "Save"}
          </Button>
        </div>

        {/* Pagination */}
        <Separator orientation="vertical" className="h-6 mx-1" />
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPage((v) => Math.max(1, v - 1))}>‹</Button>
          <span>{page} / {Math.ceil((query.data?.pageInfo.totalRows ?? 0) / pageSize) || "…"}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPage((v) => v + 1)}>›</Button>
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
            <SelectTrigger className="h-6 w-16 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[25, 50, 100, 200].map((s) => <SelectItem key={s} value={String(s)}>{s} / pg</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Data Grid ── */}
      <div className="flex-1 overflow-hidden">
        {query.isError && <Alert variant="destructive" className="m-2"><AlertDescription>{(query.error as Error)?.message || "Failed to load data."}</AlertDescription></Alert>}
        <DataGrid columns={columns} result={query.data} isLoading={query.isLoading} />
      </div>

      {/* ══ COLUMNS SHEET ══ */}
      <Sheet open={columnsOpen} onOpenChange={setColumnsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0">
          <SheetHeader className="p-4 pb-2">
            <SheetTitle>Columns <Badge variant="secondary" className="ml-2">{columns.length} selected</Badge></SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 h-[calc(100vh-80px)]">
            {/* Left: Available fields */}
            <div className="border-r overflow-hidden flex flex-col">
              <div className="p-3">
                <Input value={fieldSearch} onChange={(e) => setFieldSearch(e.target.value)} placeholder="Search fields…" className="h-8 text-sm" />
              </div>
              <ScrollArea className="flex-1 px-3">
                {Object.entries(groupedFields).map(([groupName, fields]) => (
                  <div key={groupName} className="mb-2">
                    <button className="flex items-center gap-1 w-full text-xs font-semibold text-muted-foreground hover:text-foreground py-1" onClick={() => setExpandedGroups((p) => ({ ...p, [groupName]: !p[groupName] }))}>
                      <ChevronRight className={cn("h-3 w-3 transition-transform", expandedGroups[groupName] && "rotate-90")} />
                      {groupName} <Badge variant="outline" className="ml-auto text-[10px]">{fields.length}</Badge>
                    </button>
                    {expandedGroups[groupName] && (
                      <div className="ml-4 space-y-1">
                        {fields.map((field) => (
                          <label key={field.path} className="flex items-center gap-2 py-0.5 text-sm cursor-pointer hover:bg-muted/50 rounded px-1">
                            <Checkbox checked={isFieldSelected(field.path)} onCheckedChange={() => toggleField(field.path, field.label)} className="h-3.5 w-3.5" />
                            <span className="flex-1">{field.label}</span>
                            <span className="text-[10px] text-muted-foreground">{field.type}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </ScrollArea>
            </div>

            {/* Right: Selected columns */}
            <ScrollArea className="p-3">
              {columns.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Select fields from the left panel</p>
              ) : (
                <div className="space-y-2">
                  {columns.map((col, idx) => (
                    <div key={col.id} className="flex items-center gap-2 p-2 border rounded-md text-xs bg-card">
                      <div className="flex-1 min-w-0">
                        <Input value={col.label ?? ""} className="h-6 text-xs" onChange={(e) => updateColumn(col.id, { label: e.target.value })} />
                        <span className="text-[10px] text-muted-foreground">{col.path}</span>
                      </div>
                      <Select value={col.aggregation || "none"} onValueChange={(v) => updateColumn(col.id, { aggregation: v === "none" ? undefined : v as any })}>
                        <SelectTrigger className="w-20 h-6 text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {AGGS.map((a) => <SelectItem key={a} value={a}>{AGG_LABELS[a]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveColumn(idx, "up")}><ArrowUp className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveColumn(idx, "down")}><ArrowDown className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => setColumns((prev) => prev.filter((c) => c.id !== col.id))}><X className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="text-xs" onClick={() => setColumns((prev) => prev.map((c) => ({ ...c, width: 180 })))}>Reset widths</Button>
                <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => setColumns([])}>Clear all</Button>
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {/* ══ FILTERS SHEET ══ */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Filters {activeFilterCount > 0 && <Badge variant="secondary">{activeFilterCount} {activeFilterCount === 1 ? "rule" : "rules"}</Badge>}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <p className="text-xs text-muted-foreground">Build conditions across base and related table fields. Nest groups for complex logic.</p>
            <FilterGroupEditor group={filters} onChange={setFilters} allFields={allFields} pathToLabel={pathToLabel} />
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => setFilters(defaultFilter)}>Clear all filters</Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ══ COMPUTED FIELDS SHEET ══ */}
      <Sheet open={formulaOpen} onOpenChange={setFormulaOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader><SheetTitle>Computed Fields</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-4">
            {computed.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No computed fields added</p>
            ) : (
              <div className="space-y-2">
                {computed.map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-2 border rounded-md">
                    <div>
                      <p className="text-sm font-medium">{f.label}</p>
                      <code className="text-xs text-muted-foreground">{f.expression}</code>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => {
                      setComputed((prev) => prev.filter((c) => c.id !== f.id));
                      setColumns((prev) => prev.filter((c) => c.id !== f.id));
                    }}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            )}
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium">New computed field</p>
              <Input placeholder="Label" value={formulaLabel} onChange={(e) => setFormulaLabel(e.target.value)} className="h-8 text-sm" />
              <Textarea placeholder='Expression e.g. concat(first_name, " ", last_name) or amount * probability' value={formulaExpr} onChange={(e) => setFormulaExpr(e.target.value)} className="text-sm" rows={3} />
              <Button size="sm" onClick={addComputed}><Plus className="h-3 w-3 mr-1" />Add</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ══ SAVE VIEW SHEET ══ */}
      <Sheet open={saveOpen} onOpenChange={setSaveOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader><SheetTitle>{selectedViewId ? "Update View" : "Save View"}</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>View Name</Label>
              <Input value={viewName} onChange={(e) => setViewName(e.target.value)} placeholder="My view…" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={viewDescription} onChange={(e) => setViewDescription(e.target.value)} placeholder="Optional description…" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Sharing</Label>
              <Select value={sharing} onValueChange={(v: any) => setSharing(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIVATE"><div className="flex items-center gap-2"><Lock className="h-3 w-3" />Private</div></SelectItem>
                  <SelectItem value="TEAM"><div className="flex items-center gap-2"><Users className="h-3 w-3" />Team</div></SelectItem>
                  <SelectItem value="ORG"><div className="flex items-center gap-2"><Globe className="h-3 w-3" />Organization</div></SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={saveView} disabled={saveMutations.isSaving} className="w-full">
              <Save className="h-4 w-4 mr-2" />{selectedViewId ? "Update View" : "Save View"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
