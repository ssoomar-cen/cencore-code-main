import { supabase } from "@/integrations/supabase/client";
import { BaseEntity, EntityMetadata, FilterGroup, FilterRule, QueryRequest, QueryResponse, SavedView } from "../types/viewBuilder";

const LOCAL_SAVED_VIEWS_KEY = "cencore_saved_views_v2";

type BaseRow = Record<string, unknown>;

// ── Entity metadata (maps to our actual Supabase schema) ──
const localMetadata: Record<string, EntityMetadata> = {
  opportunities: {
    entity: "opportunities",
    fields: [
      { path: "name", label: "Opportunity", type: "string" },
      { path: "stage", label: "Stage", type: "string" },
      { path: "status", label: "Status", type: "string" },
      { path: "amount", label: "Amount", type: "number" },
      { path: "probability", label: "Probability", type: "number" },
      { path: "close_date", label: "Close Date", type: "date" },
      { path: "lead_source", label: "Lead Source", type: "string" },
      { path: "next_step", label: "Next Step", type: "string" },
      { path: "description", label: "Description", type: "string" },
      { path: "accounts.name", label: "Account", type: "string" },
      { path: "contacts.first_name", label: "Contact First Name", type: "string" },
      { path: "contacts.last_name", label: "Contact Last Name", type: "string" },
      { path: "created_at", label: "Created At", type: "date" },
      { path: "updated_at", label: "Updated At", type: "date" },
    ],
    relations: [
      { name: "accounts", toEntity: "accounts", cardinality: "one" },
      { name: "contacts", toEntity: "contacts", cardinality: "one" },
    ],
  },
  accounts: {
    entity: "accounts",
    fields: [
      { path: "name", label: "Name", type: "string" },
      { path: "industry", label: "Industry", type: "string" },
      { path: "account_type", label: "Type", type: "string" },
      { path: "status", label: "Status", type: "string" },
      { path: "email", label: "Email", type: "string" },
      { path: "phone", label: "Phone", type: "string" },
      { path: "website", label: "Website", type: "string" },
      { path: "annual_revenue", label: "Annual Revenue", type: "number" },
      { path: "employee_count", label: "Employees", type: "number" },
      { path: "address_city", label: "City", type: "string" },
      { path: "address_state", label: "State", type: "string" },
      { path: "created_at", label: "Created At", type: "date" },
      { path: "updated_at", label: "Updated At", type: "date" },
    ],
    relations: [],
  },
  contacts: {
    entity: "contacts",
    fields: [
      { path: "first_name", label: "First Name", type: "string" },
      { path: "last_name", label: "Last Name", type: "string" },
      { path: "email", label: "Email", type: "string" },
      { path: "phone", label: "Phone", type: "string" },
      { path: "mobile", label: "Mobile", type: "string" },
      { path: "job_title", label: "Job Title", type: "string" },
      { path: "department", label: "Department", type: "string" },
      { path: "status", label: "Status", type: "string" },
      { path: "address_city", label: "City", type: "string" },
      { path: "address_state", label: "State", type: "string" },
      { path: "accounts.name", label: "Account", type: "string" },
      { path: "created_at", label: "Created At", type: "date" },
      { path: "updated_at", label: "Updated At", type: "date" },
    ],
    relations: [{ name: "accounts", toEntity: "accounts", cardinality: "one" }],
  },
  leads: {
    entity: "leads",
    fields: [
      { path: "first_name", label: "First Name", type: "string" },
      { path: "last_name", label: "Last Name", type: "string" },
      { path: "email", label: "Email", type: "string" },
      { path: "phone", label: "Phone", type: "string" },
      { path: "company", label: "Company", type: "string" },
      { path: "job_title", label: "Job Title", type: "string" },
      { path: "lead_source", label: "Lead Source", type: "string" },
      { path: "status", label: "Status", type: "string" },
      { path: "rating", label: "Rating", type: "string" },
      { path: "estimated_value", label: "Est. Value", type: "number" },
      { path: "created_at", label: "Created At", type: "date" },
      { path: "updated_at", label: "Updated At", type: "date" },
    ],
    relations: [],
  },
  quotes: {
    entity: "quotes",
    fields: [
      { path: "quote_number", label: "Quote #", type: "string" },
      { path: "name", label: "Name", type: "string" },
      { path: "status", label: "Status", type: "string" },
      { path: "subtotal", label: "Subtotal", type: "number" },
      { path: "discount", label: "Discount", type: "number" },
      { path: "tax", label: "Tax", type: "number" },
      { path: "total", label: "Total", type: "number" },
      { path: "valid_until", label: "Valid Until", type: "date" },
      { path: "accounts.name", label: "Account", type: "string" },
      { path: "opportunities.name", label: "Opportunity", type: "string" },
      { path: "created_at", label: "Created At", type: "date" },
      { path: "updated_at", label: "Updated At", type: "date" },
    ],
    relations: [
      { name: "accounts", toEntity: "accounts", cardinality: "one" },
      { name: "opportunities", toEntity: "opportunities", cardinality: "one" },
    ],
  },
  contracts: {
    entity: "contracts",
    fields: [
      { path: "contract_number", label: "Contract #", type: "string" },
      { path: "name", label: "Name", type: "string" },
      { path: "status", label: "Status", type: "string" },
      { path: "value", label: "Value", type: "number" },
      { path: "start_date", label: "Start Date", type: "date" },
      { path: "end_date", label: "End Date", type: "date" },
      { path: "terms", label: "Terms", type: "string" },
      { path: "accounts.name", label: "Account", type: "string" },
      { path: "created_at", label: "Created At", type: "date" },
      { path: "updated_at", label: "Updated At", type: "date" },
    ],
    relations: [{ name: "accounts", toEntity: "accounts", cardinality: "one" }],
  },
  invoices: {
    entity: "invoices",
    fields: [
      { path: "invoice_number", label: "Invoice #", type: "string" },
      { path: "status", label: "Status", type: "string" },
      { path: "issue_date", label: "Issue Date", type: "date" },
      { path: "due_date", label: "Due Date", type: "date" },
      { path: "subtotal", label: "Subtotal", type: "number" },
      { path: "tax", label: "Tax", type: "number" },
      { path: "total", label: "Total", type: "number" },
      { path: "amount_paid", label: "Amount Paid", type: "number" },
      { path: "accounts.name", label: "Account", type: "string" },
      { path: "created_at", label: "Created At", type: "date" },
      { path: "updated_at", label: "Updated At", type: "date" },
    ],
    relations: [{ name: "accounts", toEntity: "accounts", cardinality: "one" }],
  },
  measures: {
    entity: "measures",
    fields: [
      { path: "name", label: "Name", type: "string" },
      { path: "measure_type", label: "Type", type: "string" },
      { path: "status", label: "Status", type: "string" },
      { path: "cost", label: "Cost", type: "number" },
      { path: "estimated_savings", label: "Est. Savings", type: "number" },
      { path: "actual_savings", label: "Actual Savings", type: "number" },
      { path: "installation_date", label: "Installation Date", type: "date" },
      { path: "accounts.name", label: "Account", type: "string" },
      
      { path: "created_at", label: "Created At", type: "date" },
      { path: "updated_at", label: "Updated At", type: "date" },
    ],
    relations: [
      { name: "accounts", toEntity: "accounts", cardinality: "one" },
      
    ],
  },
  buildings: {
    entity: "buildings",
    fields: [
      { path: "name", label: "Name", type: "string" },
      { path: "building_type", label: "Type", type: "string" },
      { path: "status", label: "Status", type: "string" },
      { path: "square_footage", label: "Sq Ft", type: "number" },
      { path: "year_built", label: "Year Built", type: "number" },
      { path: "energy_star_score", label: "Energy Star", type: "number" },
      { path: "address_street", label: "Address", type: "string" },
      { path: "address_city", label: "City", type: "string" },
      { path: "address_state", label: "State", type: "string" },
      { path: "address_zip", label: "Zip", type: "string" },
      { path: "accounts.name", label: "Account", type: "string" },
      { path: "created_at", label: "Created At", type: "date" },
      { path: "updated_at", label: "Updated At", type: "date" },
    ],
    relations: [{ name: "accounts", toEntity: "accounts", cardinality: "one" }],
  },
  activities: {
    entity: "activities",
    fields: [
      { path: "subject", label: "Subject", type: "string" },
      { path: "activity_type", label: "Type", type: "string" },
      { path: "status", label: "Status", type: "string" },
      { path: "priority", label: "Priority", type: "string" },
      { path: "due_date", label: "Due Date", type: "date" },
      { path: "completed_at", label: "Completed At", type: "date" },
      { path: "description", label: "Description", type: "string" },
      { path: "accounts.name", label: "Account", type: "string" },
      { path: "contacts.first_name", label: "Contact First Name", type: "string" },
      { path: "contacts.last_name", label: "Contact Last Name", type: "string" },
      { path: "created_at", label: "Created At", type: "date" },
      { path: "updated_at", label: "Updated At", type: "date" },
    ],
    relations: [
      { name: "accounts", toEntity: "accounts", cardinality: "one" },
      { name: "contacts", toEntity: "contacts", cardinality: "one" },
    ],
  },
  connections: {
    entity: "connections",
    fields: [
      { path: "relationship_type", label: "Relationship", type: "string" },
      { path: "notes", label: "Notes", type: "string" },
      { path: "created_at", label: "Created At", type: "date" },
    ],
    relations: [],
  },
  commission_splits: {
    entity: "commission_splits",
    fields: [
      { path: "sales_rep_name", label: "Sales Rep", type: "string" },
      { path: "sales_rep_email", label: "Rep Email", type: "string" },
      { path: "split_percentage", label: "Split %", type: "number" },
      { path: "amount", label: "Amount", type: "number" },
      { path: "status", label: "Status", type: "string" },
      { path: "opportunities.name", label: "Opportunity", type: "string" },
      { path: "created_at", label: "Created At", type: "date" },
      { path: "updated_at", label: "Updated At", type: "date" },
    ],
    relations: [{ name: "opportunities", toEntity: "opportunities", cardinality: "one" }],
  },
};

// ── Relation config per entity (maps relation name to Supabase foreign key) ──
const entityRelations: Record<string, Record<string, string>> = {
  opportunities: { accounts: "account_id", contacts: "contact_id" },
  contacts: { accounts: "account_id" },
  quotes: { accounts: "account_id", opportunities: "opportunity_id" },
  contracts: { accounts: "account_id" },
  invoices: { accounts: "account_id" },
  measures: { accounts: "account_id" },
  buildings: { accounts: "account_id" },
  activities: { accounts: "account_id", contacts: "contact_id" },
  commission_splits: { opportunities: "opportunity_id" },
};

// ── Build Supabase select string from required paths ──
function buildSelect(entity: string, paths: Set<string>): string {
  const base = new Set<string>(["id", "created_at"]);
  const relFields: Record<string, Set<string>> = {};
  const rels = entityRelations[entity] || {};

  for (const path of paths) {
    const dotIdx = path.indexOf(".");
    if (dotIdx > -1) {
      const relName = path.slice(0, dotIdx);
      const field = path.slice(dotIdx + 1);
      if (rels[relName]) {
        if (!relFields[relName]) relFields[relName] = new Set();
        relFields[relName].add(field);
      }
    } else {
      base.add(path);
    }
  }

  const parts: string[] = [Array.from(base).join(",")];
  for (const [relName, fields] of Object.entries(relFields)) {
    parts.push(`${relName}(${Array.from(fields).join(",")})`);
  }
  return parts.join(",");
}

// ── Flatten row: { accounts: { name: "X" } } → { "accounts.name": "X" } ──
function flattenRow(row: Record<string, unknown>): BaseRow {
  const out: BaseRow = {};
  for (const [key, val] of Object.entries(row)) {
    if (val && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
      for (const [subKey, subVal] of Object.entries(val as Record<string, unknown>)) {
        out[`${key}.${subKey}`] = subVal;
      }
    } else {
      out[key] = val;
    }
  }
  return out;
}

// ── Apply client-side filters ──
function getByPath(obj: BaseRow, path: string): unknown {
  return obj[path];
}

function matchRule(row: BaseRow, rule: FilterRule): boolean {
  const raw = getByPath(row, rule.path);
  const val = rule.value;
  switch (rule.op) {
    case "eq": return String(raw ?? "") === String(val ?? "");
    case "neq": return String(raw ?? "") !== String(val ?? "");
    case "contains": return String(raw ?? "").toLowerCase().includes(String(val ?? "").toLowerCase());
    case "gt": return Number(raw ?? 0) > Number(val ?? 0);
    case "gte": return Number(raw ?? 0) >= Number(val ?? 0);
    case "lt": return Number(raw ?? 0) < Number(val ?? 0);
    case "lte": return Number(raw ?? 0) <= Number(val ?? 0);
    case "isNull": return raw === null || raw === undefined || raw === "";
    case "notNull": return raw !== null && raw !== undefined && raw !== "";
    case "between": {
      if (!Array.isArray(val) || val.length < 2) return true;
      const n = Number(raw ?? 0);
      return n >= Number(val[0]) && n <= Number(val[1]);
    }
    default: return true;
  }
}

function applyFilterGroup(rows: BaseRow[], group?: FilterGroup): BaseRow[] {
  if (!group || !group.filters.length) return rows;
  return rows.filter((row) => {
    const checks = group.filters.map((f) => {
      if ("filters" in f) return applyFilterGroup([row], f).length > 0;
      return matchRule(row, f as FilterRule);
    });
    return group.op === "or" ? checks.some(Boolean) : checks.every(Boolean);
  });
}

// ── Computed fields ──
function evalComputed(expression: string, row: BaseRow): unknown {
  const exp = expression.trim();
  if (/^concat\(/i.test(exp)) {
    const inner = exp.slice(exp.indexOf("(") + 1, -1);
    return inner.split(",").map((p) => {
      const t = p.trim();
      if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"')))
        return t.slice(1, -1);
      return String(getByPath(row, t) ?? "");
    }).join("");
  }
  if (/^daysUntil\(/i.test(exp)) {
    const inner = exp.slice(exp.indexOf("(") + 1, -1).trim();
    const raw = getByPath(row, inner);
    if (!raw) return null;
    const target = new Date(String(raw)).getTime();
    if (Number.isNaN(target)) return null;
    return Math.ceil((target - Date.now()) / 86_400_000);
  }
  const mul = exp.split("*").map((s) => s.trim());
  if (mul.length === 2) {
    const left = Number(getByPath(row, mul[0]) ?? 0);
    const right = Number(getByPath(row, mul[1]) ?? 0);
    if (Number.isFinite(left) && Number.isFinite(right)) return left * right;
  }
  return null;
}

// ── Main query function ──
export async function queryView(payload: QueryRequest): Promise<QueryResponse> {
  const entity = payload.baseEntity;
  const requiredPaths = new Set<string>();
  for (const col of payload.columns) requiredPaths.add(col.path);
  for (const sort of payload.sorts ?? []) requiredPaths.add(sort.path);
  requiredPaths.add("created_at");

  const select = buildSelect(entity, requiredPaths);

  let q = (supabase as any).from(entity).select(select, { count: "exact" });

  // Apply server-side sort
  if (payload.sorts?.length) {
    const sort = payload.sorts[0];
    if (!sort.path.includes(".")) {
      q = q.order(sort.path, { ascending: sort.dir === "asc" });
    }
  } else {
    q = q.order("created_at", { ascending: false });
  }

  const { data, error, count } = await q;
  if (error) throw error;

  let rows = ((data || []) as Record<string, unknown>[]).map(flattenRow);

  // Client-side filters
  if (payload.filters?.filters.length) {
    rows = applyFilterGroup(rows, payload.filters);
  }

  // Computed fields
  if (payload.computed?.length) {
    rows = rows.map((row) => {
      const newRow = { ...row };
      for (const cf of payload.computed!) {
        newRow[cf.id] = evalComputed(cf.expression, row);
      }
      return newRow;
    });
  }

  // Client-side sort for relation paths
  if (payload.sorts?.length && payload.sorts[0].path.includes(".")) {
    const sort = payload.sorts[0];
    rows.sort((a, b) => {
      const aVal = String(getByPath(a, sort.path) ?? "");
      const bVal = String(getByPath(b, sort.path) ?? "");
      return sort.dir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }

  // Pagination
  const page = payload.pagination?.page ?? 1;
  const pageSize = payload.pagination?.pageSize ?? 50;
  const totalRows = rows.length;
  const start = (page - 1) * pageSize;
  const paged = rows.slice(start, start + pageSize);

  return {
    rows: paged,
    pageInfo: { page, pageSize, totalRows: count ?? totalRows },
  };
}

export async function getEntityMetadata(entity: string): Promise<EntityMetadata> {
  return localMetadata[entity] ?? { entity: entity as BaseEntity, fields: [], relations: [] };
}

// ── Saved views (localStorage-based) ──
function getLocalViews(): SavedView[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_SAVED_VIEWS_KEY) || "[]");
  } catch { return []; }
}

function setLocalViews(views: SavedView[]) {
  localStorage.setItem(LOCAL_SAVED_VIEWS_KEY, JSON.stringify(views));
}

export async function listSavedViews(entity: string): Promise<SavedView[]> {
  return getLocalViews().filter((v) => v.baseEntity === entity);
}

export async function createSavedView(payload: Omit<SavedView, "id" | "createdAt">): Promise<SavedView> {
  const views = getLocalViews();
  const view: SavedView = {
    ...payload,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  views.push(view);
  setLocalViews(views);
  return view;
}

export async function updateSavedView(id: string, payload: Partial<SavedView>): Promise<SavedView> {
  const views = getLocalViews();
  const idx = views.findIndex((v) => v.id === id);
  if (idx === -1) throw new Error("View not found");
  views[idx] = { ...views[idx], ...payload };
  setLocalViews(views);
  return views[idx];
}

export async function deleteSavedView(id: string): Promise<void> {
  setLocalViews(getLocalViews().filter((v) => v.id !== id));
}

export async function starSavedView(id: string): Promise<void> {
  const views = getLocalViews();
  const view = views.find((v) => v.id === id);
  if (view) {
    view.starred = !view.starred;
    setLocalViews(views);
  }
}

// ── Export (CSV) ──
export async function exportView(type: "csv" | "xlsx", payload: QueryRequest): Promise<void> {
  const result = await queryView({ ...payload, pagination: { page: 1, pageSize: 10000 } });
  const headers = payload.columns.map((c) => c.label || c.path);
  const csvRows = [
    headers.join(","),
    ...result.rows.map((row) =>
      payload.columns.map((col) => {
        const val = row[col.id] ?? row[col.path] ?? "";
        const str = String(val);
        return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(",")
    ),
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${payload.baseEntity}_export.${type === "xlsx" ? "csv" : "csv"}`;
  a.click();
  URL.revokeObjectURL(url);
}
