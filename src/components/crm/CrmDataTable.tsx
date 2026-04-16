import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, Check, X, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { CrmToolbar, FilterConfig } from "./CrmToolbar";
import { CrmKanbanView } from "./CrmKanbanView";
import { CrmRecordDetail, RelatedTab, LookupLink, BusinessProcessFlow, DrillDownConfig } from "./CrmRecordDetail";

export interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
}

export interface FormField {
  key: string;
  label: string;
  type?: "text" | "email" | "number" | "select" | "textarea" | "date";
  options?: { label: string; value: string }[];
  placeholder?: string;
  required?: boolean;
  section?: string;
}

export interface KanbanConfig {
  groupField: string;
  columns: { value: string; label: string }[];
  titleField: string;
  subtitleField?: string;
  badgeField?: string;
  amountField?: string;
}

export interface CrmDataTableProps {
  title: string;
  description?: string;
  columns: Column[];
  data: any[];
  isLoading: boolean;
  formFields: FormField[];
  onCreate: (data: any) => void;
  onUpdate: (data: any) => void;
  onDelete?: (id: string) => void;
  createLabel?: string;
  extraActions?: React.ReactNode;
  rowActions?: (row: any) => React.ReactNode;
  filters?: FilterConfig[];
  kanban?: KanbanConfig;
  onRowClick?: (row: any) => void;
  /** When set, clicking a record navigates to this route + /recordId instead of opening inline detail */
  detailRoute?: string;
  entityLabel?: string;
  headerFields?: { key: string; label: string }[];
  relatedTabs?: RelatedTab[];
  lookupLinks?: LookupLink[];
  businessProcessFlow?: BusinessProcessFlow;
}

function InlineEditCell({ field, value, onChange }: { field: FormField | undefined; value: any; onChange: (v: any) => void }) {
  if (!field) return <span>{value ?? "—"}</span>;

  if (field.type === "select") {
    return (
      <Select value={value ?? ""} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder={`Select...`} />
        </SelectTrigger>
        <SelectContent>
          {field.options?.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      className="h-8 text-xs"
      type={field.type || "text"}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      autoFocus={false}
    />
  );
}

// Recursively flatten any value to a searchable string.
// Objects are unwrapped via common display keys (name, label, value),
// arrays are joined, and primitives are stringified.
function toSearchable(val: any): string {
  if (val == null) return "";
  if (Array.isArray(val)) return val.map(toSearchable).join(" ");
  if (typeof val === "object") {
    const display = val.name ?? val.label ?? val.value;
    if (display != null) return String(display);
    return Object.values(val).map(toSearchable).join(" ");
  }
  return String(val);
}

export function CrmDataTable({
  title, description, columns, data, isLoading, formFields,
  onCreate, onUpdate, onDelete, createLabel = "Add New",
  extraActions, rowActions, filters = [], kanban, onRowClick,
  detailRoute,
  entityLabel, headerFields, relatedTabs, lookupLinks, businessProcessFlow,
}: CrmDataTableProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editRowId, setEditRowId] = useState<string | null>(null);
  const [detailRecord, setDetailRecord] = useState<any>(null);
  const [childRecord, setChildRecord] = useState<any>(null);
  const [childDrillConfig, setChildDrillConfig] = useState<DrillDownConfig | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [view, setView] = useState<"list" | "kanban">("list");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // Auto-open record from URL query param ?open=<recordId>
  useEffect(() => {
    const openId = searchParams.get("open");
    if (openId && data && data.length > 0 && !detailRecord) {
      const found = data.find((r) => r.id === openId);
      if (found) {
        if (detailRoute) {
          navigate(`${detailRoute}/${found.id}`);
        } else {
          setDetailRecord(found);
        }
        searchParams.delete("open");
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, data, detailRecord, detailRoute, navigate]);

  const fieldMap = new Map(formFields.map((f) => [f.key, f]));

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    let result = (data || []).filter((row) => {
      if (needle) {
        const match = columns.some((col) =>
          toSearchable(row[col.key]).toLowerCase().includes(needle)
        );
        if (!match) return false;
      }
      for (const f of filters) {
        const fv = filterValues[f.key];
        if (fv && fv !== "all") {
          const rowVal = (row[f.key] || "").toString().toLowerCase();
          if (rowVal !== fv.toLowerCase()) return false;
        }
      }
      return true;
    });

    if (sortKey) {
      result = [...result].sort((a, b) => {
        let aVal = a[sortKey];
        let bVal = b[sortKey];
        // Handle nested objects (e.g. accounts.name)
        if (aVal && typeof aVal === "object") aVal = aVal.name || "";
        if (bVal && typeof bVal === "object") bVal = bVal.name || "";
        if (aVal == null) aVal = "";
        if (bVal == null) bVal = "";
        // Numeric comparison
        const aNum = Number(aVal);
        const bNum = Number(bVal);
        if (!isNaN(aNum) && !isNaN(bNum) && aVal !== "" && bVal !== "") {
          return sortDir === "asc" ? aNum - bNum : bNum - aNum;
        }
        const cmp = String(aVal).localeCompare(String(bVal), undefined, { sensitivity: "base" });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [data, search, columns, filters, filterValues, sortKey, sortDir]);

  const resetForm = () => {
    setFormData({});
    setCreateOpen(false);
    setEditRowId(null);
  };

  const handleCreate = (data: any) => { onCreate(data); setCreateOpen(false); };

  const sanitizeFormData = (data: Record<string, any>) => {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const field = formFields.find((f) => f.key === key);
      sanitized[key] = (value === "" && !field?.required) ? null : value;
    }
    return sanitized;
  };

  const handleInlineSave = () => {
    if (editRowId) {
      onUpdate({ id: editRowId, ...sanitizeFormData(formData) });
      setEditRowId(null);
      setFormData({});
    }
  };

  const handleInlineCancel = () => {
    setEditRowId(null);
    setFormData({});
  };

  const openInlineEdit = (item: any) => {
    setEditRowId(item.id);
    const d: Record<string, any> = {};
    formFields.forEach((f) => { d[f.key] = item[f.key] ?? ""; });
    setFormData(d);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  // If creating a new record, show full-page form
  if (createOpen) {
    return (
      <CrmRecordDetail
        formFields={formFields}
        title={`New ${title.replace(/s$/, "")}`}
        entityLabel={entityLabel || title.replace(/s$/, "")}
        onSave={handleCreate}
        onBack={() => setCreateOpen(false)}
        isNew
        lookupLinks={lookupLinks}
      />
    );
  }

  // If a child record is open (drill-down from a related tab)
  if (detailRecord && childRecord && childDrillConfig) {
    const childTitle = childDrillConfig.titleField
      ? (childRecord[childDrillConfig.titleField] || "Record")
      : (childRecord[childDrillConfig.formFields?.[0]?.key] || "Record");
    return (
      <CrmRecordDetail
        record={childRecord}
        formFields={childDrillConfig.formFields}
        title={childTitle}
        entityLabel={childDrillConfig.entityLabel || "Record"}
        headerFields={childDrillConfig.headerFields}
        relatedTabs={childDrillConfig.relatedTabs}
        lookupLinks={childDrillConfig.lookupLinks}
        onSave={() => {}}
        onBack={() => { setChildRecord(null); setChildDrillConfig(null); }}
      />
    );
  }

  // If a record is open in detail view
  if (detailRecord) {
    return (
      <CrmRecordDetail
        record={detailRecord}
        formFields={formFields}
        title={detailRecord[columns[0]?.key] || "Record"}
        entityLabel={entityLabel || title.replace(/s$/, "")}
        headerFields={headerFields}
        relatedTabs={relatedTabs}
        lookupLinks={lookupLinks}
        businessProcessFlow={businessProcessFlow}
        onSave={onUpdate}
        onBack={() => setDetailRecord(null)}
        onDrillDown={(row, config) => { setChildRecord(row); setChildDrillConfig(config); }}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>

      <CrmToolbar
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        view={view}
        onViewChange={setView}
        showKanban={!!kanban}
        recordCount={filtered.length}
        createLabel={createLabel}
        onCreateClick={() => { setFormData({}); setCreateOpen(true); }}
        extraActions={extraActions}
      />

      {view === "kanban" && kanban ? (
        <CrmKanbanView
          data={filtered}
          groupField={kanban.groupField}
          columns={kanban.columns}
          titleField={kanban.titleField}
          subtitleField={kanban.subtitleField}
          badgeField={kanban.badgeField}
          amountField={kanban.amountField}
          onEdit={openInlineEdit}
          onDelete={onDelete}
        />
      ) : (
        <div className="border rounded-lg overflow-x-auto scrollbar-thin">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortKey === col.key ? (
                        sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-primary" /> : <ArrowDown className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
                      )}
                    </div>
                  </TableHead>
                ))}
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="text-center py-8 text-muted-foreground">
                    No records found. Click "{createLabel}" to add one.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => {
                  const isEditing = editRowId === row.id;
                  return (
                    <TableRow
                      key={row.id}
                      className={`cursor-pointer hover:bg-muted/50 ${isEditing ? "bg-accent/30 ring-1 ring-primary/20" : ""}`}
                      onClick={() => {
                        if (!isEditing) {
                          if (detailRoute) {
                            navigate(`${detailRoute}/${row.id}`);
                          } else {
                            onRowClick?.(row);
                          }
                        }
                      }}
                      onDoubleClick={(e) => { e.stopPropagation(); if (!isEditing) { detailRoute ? navigate(`${detailRoute}/${row.id}`) : setDetailRecord(row); } }}
                    >
                      {columns.map((col) => (
                        <TableCell key={col.key} className="py-1">
                          {isEditing ? (
                            <InlineEditCell
                              field={fieldMap.get(col.key)}
                              value={formData[col.key]}
                              onChange={(v) => setFormData((prev) => ({ ...prev, [col.key]: v }))}
                            />
                          ) : (
                            col.render ? col.render(row[col.key], row) : (row[col.key] ?? "—")
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="py-1">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={handleInlineSave} title="Save">
                              <Check className="h-4 w-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleInlineCancel} title="Cancel">
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openInlineEdit(row)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {onDelete && (
                              <Button variant="ghost" size="icon" onClick={() => onDelete(row.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                            {rowActions?.(row)}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
