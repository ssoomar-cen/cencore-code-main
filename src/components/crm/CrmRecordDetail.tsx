import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, Plus, Pencil, ChevronRight, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "./CrmDataTable";

export interface LookupLink {
  key: string;
  route: string;
  data: any[];
  labelFn: (item: any) => string;
}

export interface DrillDownConfig {
  /** Entity label shown in the detail header (e.g. "Invoice Item") */
  entityLabel?: string;
  /** Which field on the row to use as the detail page title */
  titleField?: string;
  formFields: FormField[];
  headerFields?: { key: string; label: string }[];
  relatedTabs?: RelatedTab[];
  lookupLinks?: LookupLink[];
}

export interface RelatedTab {
  key: string;
  label: string;
  foreignKey: string;
  columns: { key: string; label: string; render?: (value: any, row: any) => React.ReactNode }[];
  data: any[];
  panel?: "left" | "right";
  route?: string;
  /** When set, clicking a row opens an inline drill-down detail instead of navigating away */
  drillDown?: DrillDownConfig;
  /** Form fields for creating a new related record inline */
  createFields?: FormField[];
  /** Called when a new related record is created */
  onCreate?: (data: any) => void;
}

export interface BusinessProcessFlow {
  stageField: string;
  stages: { value: string; label: string }[];
  showWhen?: (record: Record<string, any>) => boolean;
  onStageChange?: (newStage: string) => void;
}

interface CrmRecordDetailProps {
  record?: Record<string, any>;
  formFields: FormField[];
  title: string;
  entityLabel?: string;
  onSave: (data: any) => void;
  onBack: () => void;
  isNew?: boolean;
  headerFields?: { key: string; label: string }[];
  relatedTabs?: RelatedTab[];
  lookupLinks?: LookupLink[];
  businessProcessFlow?: BusinessProcessFlow;
  /** Called when a related-tab row with drillDown config is clicked */
  onDrillDown?: (row: any, config: DrillDownConfig) => void;
}

export function CrmRecordDetail({
  record, formFields, title, entityLabel, onSave, onBack, isNew,
  headerFields = [], relatedTabs = [], lookupLinks = [],
  businessProcessFlow, onDrillDown,
}: CrmRecordDetailProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const d: Record<string, any> = {};
    formFields.forEach((f) => { d[f.key] = record?.[f.key] ?? ""; });
    return d;
  });
  const [isEditing, setIsEditing] = useState(!!isNew);
  const [createDialogTab, setCreateDialogTab] = useState<string | null>(null);
  const [createFormData, setCreateFormData] = useState<Record<string, any>>({});

  const getDisplayText = (value: any): string => {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "object") {
      if (typeof value.name === "string") return value.name;
      if (typeof value.label === "string") return value.label;
      return JSON.stringify(value);
    }
    return String(value);
  };

  const handleSave = () => {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(formData)) {
      const field = formFields.find((f) => f.key === key);
      if (value === "" && !field?.required) {
        sanitized[key] = null;
      } else {
        sanitized[key] = value;
      }
    }
    if (isNew) {
      onSave(sanitized);
    } else {
      onSave({ id: record!.id, ...sanitized });
    }
    if (isNew) {
      onBack();
    } else {
      setIsEditing(false);
    }
  };

  const leftTabs = relatedTabs.filter((t) => t.panel !== "right");
  const rightTabs = relatedTabs.filter((t) => t.panel === "right");

  const getRelatedData = (tab: RelatedTab) => {
    if (!record?.id) return [];
    return tab.data.filter((row) => row[tab.foreignKey] === record.id);
  };

  const getLookupDisplay = (fieldKey: string, value: any): { label: string; route?: string; recordId?: string } | null => {
    if (!value) return null;
    const lookup = lookupLinks.find((l) => l.key === fieldKey);
    if (!lookup) return null;
    const item = lookup.data.find((d) => d.id === value);
    if (!item) return null;
    return { label: lookup.labelFn(item), route: lookup.route, recordId: item.id };
  };

  // Inline create related record
  const handleOpenCreateDialog = (tabKey: string) => {
    const tab = relatedTabs.find((t) => t.key === tabKey);
    if (!tab?.createFields) return;
    const defaults: Record<string, any> = {};
    tab.createFields.forEach((f) => { defaults[f.key] = ""; });
    // Pre-fill the foreign key
    if (record?.id) {
      defaults[tab.foreignKey] = record.id;
    }
    setCreateFormData(defaults);
    setCreateDialogTab(tabKey);
  };

  const handleCreateRelated = () => {
    const tab = relatedTabs.find((t) => t.key === createDialogTab);
    if (!tab?.onCreate) return;
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(createFormData)) {
      const field = tab.createFields?.find((f) => f.key === key);
      sanitized[key] = (value === "" && !field?.required) ? null : value;
    }
    tab.onCreate(sanitized);
    setCreateDialogTab(null);
    setCreateFormData({});
  };

  const renderField = (field: FormField) => {
    const value = formData[field.key] ?? "";

    if (!isEditing) {
      const displayValue = record?.[field.key];
      const lookup = getLookupDisplay(field.key, displayValue);

      if (field.type === "select" && !lookup) {
        const option = field.options?.find((o) => o.value === displayValue);
        return (
          <div key={field.key} className="group flex items-baseline gap-3 py-2.5 px-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-2/5 shrink-0">{field.label}</span>
            <span className="text-sm text-foreground flex-1">{option?.label || displayValue || "—"}</span>
          </div>
        );
      }

      return (
        <div key={field.key} className="group flex items-baseline gap-3 py-2.5 px-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-2/5 shrink-0">{field.label}</span>
          <span className="text-sm text-foreground flex-1">
            {lookup ? (
              <button
                onClick={() => navigate(`${lookup.route}?open=${lookup.recordId}`)}
                className="text-primary hover:underline cursor-pointer text-left font-medium"
              >
                {lookup.label}
              </button>
            ) : (
              getDisplayText(displayValue)
            )}
          </span>
        </div>
      );
    }

    return (
      <div key={field.key} className="space-y-1">
        <Label htmlFor={field.key} className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {field.label}{field.required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {field.type === "select" ? (
          <Select value={value} onValueChange={(v) => setFormData((prev) => ({ ...prev, [field.key]: v }))}>
            <SelectTrigger className="h-9 bg-background border-input/60 focus:border-primary transition-colors">
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : field.type === "textarea" ? (
          <Textarea
            id={field.key}
            value={value}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
            className="min-h-[72px] bg-background border-input/60 focus:border-primary transition-colors resize-none"
          />
        ) : (
          <Input
            id={field.key}
            type={field.type || "text"}
            value={value}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
            required={field.required}
            className="h-9 bg-background border-input/60 focus:border-primary transition-colors"
          />
        )}
      </div>
    );
  };

  const renderCreateField = (field: FormField) => (
    <div key={field.key} className="space-y-1">
      <Label htmlFor={`create-${field.key}`} className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {field.label}{field.required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {field.type === "select" ? (
        <Select value={createFormData[field.key] ?? ""} onValueChange={(v) => setCreateFormData((prev) => ({ ...prev, [field.key]: v }))}>
          <SelectTrigger className="h-9"><SelectValue placeholder={`Select...`} /></SelectTrigger>
          <SelectContent>
            {field.options?.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
          </SelectContent>
        </Select>
      ) : field.type === "textarea" ? (
        <Textarea id={`create-${field.key}`} value={createFormData[field.key] ?? ""} placeholder={field.placeholder}
          onChange={(e) => setCreateFormData((prev) => ({ ...prev, [field.key]: e.target.value }))} className="min-h-[72px]" />
      ) : (
        <Input id={`create-${field.key}`} type={field.type || "text"} value={createFormData[field.key] ?? ""} placeholder={field.placeholder}
          onChange={(e) => setCreateFormData((prev) => ({ ...prev, [field.key]: e.target.value }))} required={field.required} className="h-9" />
      )}
    </div>
  );

  const renderRelatedTable = (tab: RelatedTab) => {
    const rows = getRelatedData(tab);
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground font-medium">{rows.length} record{rows.length !== 1 ? "s" : ""}</p>
          {tab.createFields && tab.onCreate && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleOpenCreateDialog(tab.key)}>
              <Plus className="h-3 w-3" /> Add {tab.label.replace(/s$/, "")}
            </Button>
          )}
        </div>
        {rows.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">No {tab.label.toLowerCase()} yet</p>
            {tab.createFields && tab.onCreate && (
              <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => handleOpenCreateDialog(tab.key)}>
                <Plus className="h-3 w-3" /> Create {tab.label.replace(/s$/, "")}
              </Button>
            )}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  {tab.columns.map((col) => (
                    <TableHead key={col.key} className="text-xs font-semibold uppercase tracking-wider h-8">{col.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow
                    key={row.id || idx}
                    className={(tab.route || tab.drillDown) ? "cursor-pointer hover:bg-accent/50 transition-colors" : ""}
                    onClick={() => {
                      if (tab.drillDown && onDrillDown) {
                        onDrillDown(row, tab.drillDown);
                      } else if (tab.route && row.id) {
                        navigate(`${tab.route}?open=${row.id}`);
                      }
                    }}
                  >
                    {tab.columns.map((col) => (
                      <TableCell key={col.key} className="text-xs py-2.5">
                        {col.render ? col.render(row[col.key], row) : (row[col.key] ?? "—")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    );
  };

  // Group form fields by section
  const sections = new Map<string, FormField[]>();
  formFields.forEach((f) => {
    const sec = f.section || "General";
    if (!sections.has(sec)) sections.set(sec, []);
    sections.get(sec)!.push(f);
  });

  const hasRightPanel = rightTabs.length > 0 && !isNew;

  const renderHeaderValue = (hf: { key: string; label: string }) => {
    const val = record?.[hf.key];
    const lookup = getLookupDisplay(hf.key, val);
    if (lookup) {
      return (
        <button
          onClick={() => navigate(`${lookup.route}?open=${lookup.recordId}`)}
          className="font-medium text-primary hover:underline cursor-pointer"
        >
          {lookup.label}
        </button>
      );
    }
    return <span className="font-medium text-foreground">{getDisplayText(val)}</span>;
  };

  // Business Process Flow
  const showBPF = businessProcessFlow && !isNew && record &&
    (!businessProcessFlow.showWhen || businessProcessFlow.showWhen(record));
  const currentStageValue = record?.[businessProcessFlow?.stageField || ""];
  const currentStageIndex = businessProcessFlow?.stages.findIndex((s) => s.value === currentStageValue) ?? -1;

  const handleStageClick = (stageValue: string) => {
    if (businessProcessFlow?.onStageChange) {
      businessProcessFlow.onStageChange(stageValue);
    }
    if (record?.id && businessProcessFlow) {
      onSave({ id: record.id, [businessProcessFlow.stageField]: stageValue });
    }
  };

  const renderBusinessProcessFlow = () => {
    if (!showBPF || !businessProcessFlow) return null;
    const stages = businessProcessFlow.stages;

    return (
      <div className="flex items-center gap-0 w-full mb-4">
        {stages.map((stage, idx) => {
          const isCompleted = idx < currentStageIndex;
          const isCurrent = idx === currentStageIndex;
          const isPending = idx > currentStageIndex;

          return (
            <button
              key={stage.value}
              onClick={() => handleStageClick(stage.value)}
              className={`
                flex-1 relative flex items-center justify-center px-3 py-2 text-xs font-semibold transition-all
                ${idx === 0 ? "rounded-l-md" : ""} ${idx === stages.length - 1 ? "rounded-r-md" : ""}
                ${isCompleted ? "bg-primary text-primary-foreground" : ""}
                ${isCurrent ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}
                ${isPending ? "bg-muted text-muted-foreground hover:bg-muted/80" : ""}
                ${!isPending ? "hover:opacity-90" : ""}
              `}
            >
              {isCompleted && <Check className="h-3 w-3 mr-1 shrink-0" />}
              <span className="truncate">{stage.label}</span>
              {idx < stages.length - 1 && (
                <div className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-0 h-0 
                  border-t-[14px] border-t-transparent border-b-[14px] border-b-transparent border-l-[8px]
                  ${isCompleted || isCurrent ? "border-l-primary" : "border-l-muted"}`}
                />
              )}
            </button>
          );
        })}
        {currentStageIndex >= 0 && currentStageIndex < stages.length - 1 && (
          <Button
            size="sm"
            className="ml-3 shrink-0 text-xs h-7"
            onClick={() => {
              const next = stages[currentStageIndex + 1];
              if (next) handleStageClick(next.value);
            }}
          >
            Next Stage
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>
    );
  };

  const renderSections = () => {
    const sectionEntries = Array.from(sections.entries());

    return sectionEntries.map(([sectionName, fields], sectionIdx) => {
      const half = Math.ceil(fields.length / 2);
      const leftFields = fields.slice(0, half);
      const rightFields = fields.slice(half);

      return (
        <div key={sectionName} className="mb-1">
          {sectionIdx > 0 && <Separator className="mb-4" />}
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-primary rounded-full" />
            {sectionName}
          </h3>
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mb-4">
              <div className="space-y-3">{leftFields.map(renderField)}</div>
              <div className="space-y-3">{rightFields.map(renderField)}</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 mb-4">
              <div className="divide-y divide-border/30">{leftFields.map(renderField)}</div>
              <div className="divide-y divide-border/30">{rightFields.map(renderField)}</div>
            </div>
          )}
        </div>
      );
    });
  };

  const activeCreateTab = relatedTabs.find((t) => t.key === createDialogTab);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="mt-0.5 shrink-0 h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-semibold">
            {entityLabel || "Record"}
          </p>
          <h2 className="text-xl font-bold tracking-tight text-foreground truncate leading-tight">
            {getDisplayText(title)}
          </h2>
          {!isNew && headerFields.length > 0 && (
            <div className="flex flex-wrap gap-x-5 gap-y-0.5 mt-1.5">
              {headerFields.map((hf) => (
                <div key={hf.key} className="text-xs">
                  <span className="text-muted-foreground">{hf.label}: </span>
                  {renderHeaderValue(hf)}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {isEditing ? (
            <>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => {
                if (isNew) { onBack(); } else { setIsEditing(false); }
              }}>
                <X className="h-3.5 w-3.5 mr-1" /> Cancel
              </Button>
              <Button size="sm" className="h-8 text-xs" onClick={handleSave}>
                {isNew ? <Plus className="h-3.5 w-3.5 mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                {isNew ? "Create" : "Save"}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setIsEditing(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
          )}
        </div>
      </div>

      {/* Business Process Flow */}
      {renderBusinessProcessFlow()}

      {/* Main content: two-panel layout */}
      <div className={`grid gap-4 ${hasRightPanel ? "grid-cols-1 lg:grid-cols-5" : "grid-cols-1"}`}>
        {/* Left panel */}
        <div className={hasRightPanel ? "lg:col-span-3" : ""}>
          <Tabs defaultValue="details">
            <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-auto p-0 gap-0">
              <TabsTrigger
                value="details"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider"
              >
                Details
              </TabsTrigger>
              {leftTabs.map((tab) => {
                const count = getRelatedData(tab).length;
                return (
                  <TabsTrigger
                    key={tab.key}
                    value={tab.key}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider"
                  >
                    {tab.label}
                    {count > 0 && (
                      <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4 font-mono">
                        {count}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value="details" className="mt-4">
              <Card className="shadow-sm border-border/50">
                <CardContent className="pt-5 pb-4">
                  {renderSections()}
                </CardContent>
              </Card>
            </TabsContent>

            {leftTabs.map((tab) => (
              <TabsContent key={tab.key} value={tab.key} className="mt-4">
                {renderRelatedTable(tab)}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Right panel */}
        {hasRightPanel && (
          <div className="lg:col-span-2">
            <Tabs defaultValue={rightTabs[0]?.key}>
              <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-auto p-0 gap-0">
                {rightTabs.map((tab) => {
                  const count = getRelatedData(tab).length;
                  return (
                    <TabsTrigger
                      key={tab.key}
                      value={tab.key}
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider"
                    >
                      {tab.label}
                      {count > 0 && (
                        <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4 font-mono">
                          {count}
                        </Badge>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {rightTabs.map((tab) => (
                <TabsContent key={tab.key} value={tab.key} className="mt-3">
                  {renderRelatedTable(tab)}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}
      </div>

      {/* Create Related Record Dialog */}
      <Dialog open={!!createDialogTab} onOpenChange={(open) => { if (!open) setCreateDialogTab(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">
              New {activeCreateTab?.label.replace(/s$/, "") || "Record"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {activeCreateTab?.createFields
              ?.filter((f) => f.key !== activeCreateTab.foreignKey)
              .map(renderCreateField)}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setCreateDialogTab(null)}>Cancel</Button>
            <Button size="sm" onClick={handleCreateRelated}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
