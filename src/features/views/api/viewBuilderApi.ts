import { BaseEntity, EntityMetadata, FilterGroup, QueryRequest, QueryResponse, SavedView } from "../types/viewBuilder";
import { supabase } from "@/integrations/api/client";

const API_BASE = import.meta.env.VITE_VIEW_API_URL ?? "";
const VIEW_SERVER_ENABLED = String(import.meta.env.VITE_VIEW_SERVER ?? "false").toLowerCase() === "true";
const DEV_TOKEN_ENABLED = String(import.meta.env.VITE_ENABLE_DEV_TOKEN ?? "false").toLowerCase() === "true";
const LOCAL_SAVED_VIEWS_KEY = "cencore_local_saved_views_v1";
const EXPRESSION_KEYWORDS = new Set(["concat", "daysUntil"]);

type BaseRow = Record<string, unknown>;

const localMetadata: Record<string, EntityMetadata> = {
  opportunities: {
    entity: "opportunities",
    fields: [
      { path: "name", label: "Opportunity", type: "string" },
      { path: "stage", label: "Stage", type: "string" },
      { path: "amount", label: "Amount", type: "number" },
      { path: "probability", label: "Probability", type: "number" },
      { path: "close_date", label: "Close Date", type: "date" },
      { path: "account.name", label: "Account.Name", type: "string" },
      { path: "account.industry", label: "Account.Industry", type: "string" },
      { path: "account.region", label: "Account.Region", type: "string" },
      { path: "owner.first_name", label: "Owner First Name", type: "string" },
      { path: "owner.last_name", label: "Owner Last Name", type: "string" },
      { path: "created_at", label: "Created At", type: "date" },
      { path: "updated_at", label: "Updated At", type: "date" },
    ],
    relations: [
      { name: "account", toEntity: "accounts", cardinality: "one" },
      { name: "owner", toEntity: "users", cardinality: "one" },
    ],
  },
  accounts: {
    entity: "accounts",
    fields: [
      { path: "name", label: "Name", type: "string" },
      { path: "industry", label: "Industry", type: "string" },
      { path: "region", label: "Region", type: "string" },
      { path: "status", label: "Status", type: "string" },
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
      { path: "account.name", label: "Account", type: "string" },
      { path: "created_at", label: "Created At", type: "date" },
      { path: "updated_at", label: "Updated At", type: "date" },
    ],
    relations: [{ name: "account", toEntity: "accounts", cardinality: "one" }],
  },
  projects: {
    entity: "projects",
    fields: [
      { path: "name", label: "Program Name", type: "string" },
      { path: "code", label: "Program Code", type: "string" },
      { path: "service_status", label: "Service Status", type: "string" },
      { path: "status", label: "Status", type: "string" },
      { path: "account.name", label: "Organization", type: "string" },
      { path: "owner.first_name", label: "Owner First Name", type: "string" },
      { path: "owner.last_name", label: "Owner Last Name", type: "string" },
      { path: "client_manager.first_name", label: "Client Manager First Name", type: "string" },
      { path: "client_manager.last_name", label: "Client Manager Last Name", type: "string" },
      { path: "original_contract_start_date", label: "Contract Start", type: "date" },
      { path: "budget_amount", label: "Budget Amount", type: "number" },
      { path: "budget_hours", label: "Budget Hours", type: "number" },
      { path: "created_at", label: "Created At", type: "date" },
      { path: "updated_at", label: "Updated At", type: "date" },
    ],
    relations: [
      { name: "account", toEntity: "accounts", cardinality: "one" },
      { name: "owner", toEntity: "users", cardinality: "one" },
      { name: "client_manager", toEntity: "users", cardinality: "one" },
    ],
  },
  leads: {
    entity: "leads",
    fields: [
      { path: "first_name", label: "First Name", type: "string" },
      { path: "last_name", label: "Last Name", type: "string" },
      { path: "email", label: "Email", type: "string" },
      { path: "phone", label: "Phone", type: "string" },
      { path: "title", label: "Title", type: "string" },
      { path: "company", label: "Company", type: "string" },
      { path: "lead_source", label: "Lead Source", type: "string" },
      { path: "status", label: "Status", type: "string" },
      { path: "rating", label: "Rating", type: "string" },
      { path: "account.name", label: "Account", type: "string" },
      { path: "created_at", label: "Created At", type: "date" },
      { path: "updated_at", label: "Updated At", type: "date" },
    ],
    relations: [{ name: "account", toEntity: "accounts", cardinality: "one" }],
  },
  quotes: {
    entity: "quotes",
    fields: [
      { path: "quote_number", label: "Quote #", type: "string" },
      { path: "quote_type", label: "Quote Type", type: "string" },
      { path: "sub_type", label: "Sub Type", type: "string" },
      { path: "fee_type", label: "Fee Type", type: "string" },
      { path: "status", label: "Status", type: "string" },
      { path: "date_of_quote", label: "Date of Quote", type: "date" },
      { path: "valid_until", label: "Valid Until", type: "date" },
      { path: "total_amount", label: "Total Amount", type: "number" },
      { path: "total_contract_value", label: "Total Contract Value", type: "number" },
      { path: "net_contract_value", label: "Net Contract Value", type: "number" },
      { path: "discount_percent", label: "Discount %", type: "number" },
      { path: "discount_amount", label: "Discount Amount", type: "number" },
      { path: "savings_percent", label: "Savings %", type: "number" },
      { path: "opportunity.name", label: "Opportunity", type: "string" },
      { path: "created_at", label: "Created At", type: "date" },
      { path: "updated_at", label: "Updated At", type: "date" },
    ],
    relations: [{ name: "opportunity", toEntity: "opportunities", cardinality: "one" }],
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
      { path: "billing_frequency", label: "Billing Frequency", type: "string" },
      { path: "billing_cycle", label: "Billing Cycle", type: "string" },
      { path: "contract_term_months", label: "Term (Months)", type: "number" },
      { path: "auto_renew", label: "Auto Renew", type: "boolean" },
      { path: "account.name", label: "Account", type: "string" },
      { path: "opportunity.name", label: "Opportunity", type: "string" },
      { path: "created_at", label: "Created At", type: "date" },
      { path: "updated_at", label: "Updated At", type: "date" },
    ],
    relations: [
      { name: "account", toEntity: "accounts", cardinality: "one" },
      { name: "opportunity", toEntity: "opportunities", cardinality: "one" },
    ],
  },
  invoices: {
    entity: "invoices",
    fields: [
      { path: "invoice_number", label: "Invoice #", type: "string" },
      { path: "invoice_name", label: "Invoice Name", type: "string" },
      { path: "document_type", label: "Document Type", type: "string" },
      { path: "status", label: "Status", type: "string" },
      { path: "intacct_status", label: "Intacct Status", type: "string" },
      { path: "issue_date", label: "Issue Date", type: "date" },
      { path: "due_date", label: "Due Date", type: "date" },
      { path: "bill_month", label: "Bill Month", type: "string" },
      { path: "invoice_total", label: "Invoice Total", type: "number" },
      { path: "contract_amount", label: "Contract Amount", type: "number" },
      { path: "applied_amount", label: "Applied Amount", type: "number" },
      { path: "currency", label: "Currency", type: "string" },
      { path: "account.name", label: "Account", type: "string" },
      { path: "contract.name", label: "Contract", type: "string" },
      { path: "created_at", label: "Created At", type: "date" },
      { path: "updated_at", label: "Updated At", type: "date" },
    ],
    relations: [
      { name: "account", toEntity: "accounts", cardinality: "one" },
      { name: "contract", toEntity: "contracts", cardinality: "one" },
    ],
  },
  measures: {
    entity: "measures",
    fields: [
      { path: "name", label: "Name", type: "string" },
      { path: "conversion_date", label: "Conversion Date", type: "date" },
      { path: "conversion_bill_period", label: "Conversion Bill Period", type: "string" },
      { path: "measure_program_id", label: "Program ID", type: "string" },
      { path: "account.name", label: "Account", type: "string" },
      { path: "created_at", label: "Created At", type: "date" },
      { path: "updated_at", label: "Updated At", type: "date" },
    ],
    relations: [{ name: "account", toEntity: "accounts", cardinality: "one" }],
  },
  buildings: {
    entity: "buildings",
    fields: [
      { path: "name", label: "Name", type: "string" },
      { path: "building_no", label: "Building #", type: "string" },
      { path: "address_1", label: "Address", type: "string" },
      { path: "city", label: "City", type: "string" },
      { path: "state", label: "State", type: "string" },
      { path: "zip", label: "Zip", type: "string" },
      { path: "status", label: "Status", type: "string" },
      { path: "status_reason", label: "Status Reason", type: "string" },
      { path: "square_footage", label: "Sq Ft", type: "number" },
      { path: "primary_use", label: "Primary Use", type: "string" },
      { path: "ecap_building_id", label: "ECAP Building ID", type: "string" },
      { path: "created_at", label: "Created At", type: "date" },
      { path: "updated_at", label: "Updated At", type: "date" },
    ],
    relations: [],
  },
  activities: {
    entity: "activities",
    fields: [
      { path: "type", label: "Type", type: "string" },
      { path: "subject", label: "Subject", type: "string" },
      { path: "status", label: "Status", type: "string" },
      { path: "priority", label: "Priority", type: "string" },
      { path: "due_date", label: "Due Date", type: "date" },
      { path: "start_datetime", label: "Start", type: "date" },
      { path: "end_datetime", label: "End", type: "date" },
      { path: "owner.first_name", label: "Owner First Name", type: "string" },
      { path: "owner.last_name", label: "Owner Last Name", type: "string" },
      { path: "created_at", label: "Created At", type: "date" },
      { path: "updated_at", label: "Updated At", type: "date" },
    ],
    relations: [{ name: "owner", toEntity: "users", cardinality: "one" }],
  },
  connections: {
    entity: "connections",
    fields: [
      { path: "connection_number", label: "Connection #", type: "string" },
      { path: "role", label: "Role", type: "string" },
      { path: "is_active", label: "Active", type: "boolean" },
      { path: "start_date", label: "Start Date", type: "date" },
      { path: "account.name", label: "Account", type: "string" },
      { path: "contact.first_name", label: "Contact First Name", type: "string" },
      { path: "contact.last_name", label: "Contact Last Name", type: "string" },
      { path: "contact.email", label: "Contact Email", type: "string" },
      { path: "owner.first_name", label: "Owner First Name", type: "string" },
      { path: "owner.last_name", label: "Owner Last Name", type: "string" },
      { path: "created_at", label: "Created At", type: "date" },
      { path: "updated_at", label: "Updated At", type: "date" },
    ],
    relations: [
      { name: "account", toEntity: "accounts", cardinality: "one" },
      { name: "contact", toEntity: "contacts", cardinality: "one" },
      { name: "owner", toEntity: "users", cardinality: "one" },
    ],
  },
  commission_splits: {
    entity: "commission_splits",
    fields: [
      { path: "name", label: "Name", type: "string" },
      { path: "commission_type", label: "Commission Type", type: "string" },
      { path: "status", label: "Status", type: "string" },
      { path: "commission_percent", label: "Commission %", type: "number" },
      { path: "commission_percent_2", label: "Commission % 2", type: "number" },
      { path: "total_commission_for_contract_term", label: "Total Commission", type: "number" },
      { path: "first_payment_amount", label: "First Payment", type: "number" },
      { path: "first_payment_due_date", label: "First Payment Due", type: "date" },
      { path: "customer_sign_date", label: "Customer Sign Date", type: "date" },
      { path: "number_of_payments", label: "# Payments", type: "number" },
      { path: "commissions_approved", label: "Approved", type: "boolean" },
      { path: "contract.name", label: "Contract", type: "string" },
      { path: "contact.first_name", label: "Recipient First Name", type: "string" },
      { path: "contact.last_name", label: "Recipient Last Name", type: "string" },
      { path: "created_at", label: "Created At", type: "date" },
      { path: "updated_at", label: "Updated At", type: "date" },
    ],
    relations: [
      { name: "contract", toEntity: "contracts", cardinality: "one" },
      { name: "contact", toEntity: "contacts", cardinality: "one" },
    ],
  },
};

async function getToken(): Promise<string> {
  if (DEV_TOKEN_ENABLED) {
    const devToken = localStorage.getItem("dev_token");
    if (devToken) return devToken;
  }
  
  const session = await supabase.auth.getSession();
  const accessToken = session.data.session?.access_token;
  if (accessToken) return accessToken;
  
  if (DEV_TOKEN_ENABLED) {
    try {
      const devTokenResponse = await fetch(`${API_BASE}/auth/dev-token`);
      if (devTokenResponse.ok) {
        const data = await devTokenResponse.json() as { token: string };
        localStorage.setItem("dev_token", data.token);
        return data.token;
      }
    } catch {
      // Continue to next fallback
    }
  }
  
  throw new Error("No session token available");
}

function shouldUseFallback(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    /401|403|missing bearer token|invalid or expired token/i.test(message) ||
    /unauthorized|forbidden|jwt|token|permission denied/i.test(message) ||
    /database .* does not exist/i.test(message) ||
    /404|not found/i.test(message) ||
    /failed to fetch/i.test(message)
  );
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}${body ? `: ${body}` : ""}`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function getTenantId(): Promise<string | null> {
  const cacheKey = "__cencore_view_tenant_cache_v1";
  try {
    const raw = sessionStorage.getItem(cacheKey);
    if (raw) {
      const parsed = JSON.parse(raw) as { userId: string; tenantId: string | null; expiresAt: number };
      if (parsed.expiresAt > Date.now()) {
        const { data: auth } = await supabase.auth.getUser();
        if (auth.user?.id && auth.user.id === parsed.userId) return parsed.tenantId;
      }
    }
  } catch {
    // ignore cache parsing issues
  }

  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return null;

  const { data: profile } = await supabase
    .from("profile")
    .select("tenant_id")
    .eq("id", uid)
    .single();
  if (profile?.tenant_id) return profile.tenant_id;

  const { data } = await supabase.rpc("get_user_tenant", { _user_id: uid });
  const tenantId = (data as string | null) ?? null;
  try {
    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({ userId: uid, tenantId, expiresAt: Date.now() + 5 * 60 * 1000 })
    );
  } catch {
    // ignore cache write issues
  }
  return tenantId;
}

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function evalComputed(expression: string, row: Record<string, unknown>): unknown {
  const exp = expression.trim();
  if (/^concat\(/i.test(exp)) {
    const inner = exp.slice(exp.indexOf("(") + 1, -1);
    const parts = inner.split(",").map((p) => p.trim());
    return parts
      .map((part) => {
        if ((part.startsWith("'") && part.endsWith("'")) || (part.startsWith('"') && part.endsWith('"'))) {
          return part.slice(1, -1);
        }
        return String(getByPath(row, part) ?? "");
      })
      .join("");
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
    const leftRaw = getByPath(row, mul[0]);
    const rightRaw = getByPath(row, mul[1]);
    const left = Number(leftRaw ?? 0);
    const right = Number(rightRaw ?? 0);
    if (Number.isFinite(left) && Number.isFinite(right)) return left * right;
  }

  return null;
}

function matchRule(row: BaseRow, rule: { path: string; op: string; value?: unknown }): boolean {
  const raw = getByPath(row, rule.path);
  const val = rule.value as unknown;
  switch (rule.op) {
    case "eq":
      return String(raw ?? "") === String(val ?? "");
    case "contains":
      return String(raw ?? "").toLowerCase().includes(String(val ?? "").toLowerCase());
    case "gt":
      return Number(raw ?? 0) > Number(val ?? 0);
    case "lt":
      return Number(raw ?? 0) < Number(val ?? 0);
    case "between": {
      if (!Array.isArray(val) || val.length < 2) return true;
      const n = Number(raw ?? 0);
      return n >= Number(val[0]) && n <= Number(val[1]);
    }
    default:
      return true;
  }
}

function applyFilterGroup(rows: BaseRow[], group?: FilterGroup): BaseRow[] {
  if (!group || !group.filters.length) return rows;
  return rows.filter((row) => {
    const checks = group.filters.map((f) => {
      if ("filters" in f) return applyFilterGroup([row], f).length > 0;
      return matchRule(row, f);
    });
    return group.op === "or" ? checks.some(Boolean) : checks.every(Boolean);
  });
}

function collectPathsFromFilterGroup(group?: FilterGroup): string[] {
  if (!group?.filters?.length) return [];
  const out: string[] = [];
  for (const filter of group.filters) {
    if ("filters" in filter) {
      out.push(...collectPathsFromFilterGroup(filter));
      continue;
    }
    out.push(filter.path);
  }
  return out;
}

function collectExpressionPaths(expression: string): string[] {
  const tokens = expression.match(/[a-zA-Z_][a-zA-Z0-9_.]*/g) ?? [];
  return tokens.filter((token) => token.includes(".") || !EXPRESSION_KEYWORDS.has(token));
}

function computeRequiredPaths(payload: QueryRequest): Set<string> {
  const required = new Set<string>();
  for (const col of payload.columns) required.add(col.path);
  for (const path of collectPathsFromFilterGroup(payload.filters)) required.add(path);
  for (const sort of payload.sorts ?? []) required.add(sort.path);
  for (const path of payload.groupBy ?? []) required.add(path);
  for (const computed of payload.computed ?? []) {
    for (const path of collectExpressionPaths(computed.expression)) required.add(path);
  }
  required.add("created_at");
  return required;
}

interface RelationConfig {
  prefix: string;
  foreignKey: string;
  alias?: string;
}

function buildSelectGeneric(primaryKey: string, requiredPaths: Set<string>, relations: RelationConfig[]): string {
  const base = new Set<string>([primaryKey, "tenant_id"]);
  const relFields: Record<string, Set<string>> = {};
  for (const rel of relations) relFields[rel.prefix] = new Set<string>();

  for (const path of requiredPaths) {
    let matched = false;
    for (const rel of relations) {
      if (path.startsWith(rel.prefix + ".")) {
        const field = path.slice(rel.prefix.length + 1);
        if (field) relFields[rel.prefix].add(field);
        matched = true;
        break;
      }
    }
    if (!matched && !path.includes(".")) base.add(path);
  }

  const parts: string[] = [Array.from(base).join(",")];
  for (const rel of relations) {
    const fields = relFields[rel.prefix];
    if (fields.size) {
      const alias = rel.alias ?? rel.prefix;
      parts.push(`${alias}:${rel.foreignKey}(${Array.from(fields).join(",")})`);
    }
  }
  return parts.join(",");
}

function buildSelectForOpportunities(requiredPaths: Set<string>) {
  const base = new Set<string>(["opportunity_id", "tenant_id"]);
  const account = new Set<string>();
  const owner = new Set<string>();

  for (const path of requiredPaths) {
    if (path.startsWith("account.")) {
      const field = path.slice("account.".length);
      if (field) account.add(field);
      continue;
    }
    if (path.startsWith("owner.")) {
      const field = path.slice("owner.".length);
      if (field) owner.add(field);
      continue;
    }
    if (!path.includes(".")) base.add(path);
  }

  const parts: string[] = [Array.from(base).join(",")];
  if (account.size) parts.push(`account:account_id(${Array.from(account).join(",")})`);
  if (owner.size) parts.push(`owner:owner_user_id(${Array.from(owner).join(",")})`);
  return parts.join(",");
}

function buildSelectForContacts(requiredPaths: Set<string>) {
  const base = new Set<string>(["contact_id", "tenant_id"]);
  const account = new Set<string>();
  for (const path of requiredPaths) {
    if (path.startsWith("account.")) {
      const field = path.slice("account.".length);
      if (field) account.add(field);
      continue;
    }
    if (!path.includes(".")) base.add(path);
  }
  const parts: string[] = [Array.from(base).join(",")];
  if (account.size) parts.push(`account:account_id(${Array.from(account).join(",")})`);
  return parts.join(",");
}

function buildSelectForProjects(requiredPaths: Set<string>) {
  const base = new Set<string>(["project_id", "tenant_id"]);
  const account = new Set<string>();
  const owner = new Set<string>();
  const clientManager = new Set<string>();
  for (const path of requiredPaths) {
    if (path.startsWith("account.")) {
      const field = path.slice("account.".length);
      if (field) account.add(field);
      continue;
    }
    if (path.startsWith("owner.")) {
      const field = path.slice("owner.".length);
      if (field) owner.add(field);
      continue;
    }
    if (path.startsWith("client_manager.")) {
      const field = path.slice("client_manager.".length);
      if (field) clientManager.add(field);
      continue;
    }
    if (!path.includes(".")) base.add(path);
  }
  const parts: string[] = [Array.from(base).join(",")];
  if (account.size) parts.push(`account:account_id(${Array.from(account).join(",")})`);
  if (owner.size) parts.push(`owner:owner_user_id(${Array.from(owner).join(",")})`);
  if (clientManager.size) parts.push(`client_manager:client_manager_id(${Array.from(clientManager).join(",")})`);
  return parts.join(",");
}

async function fetchRows(entity: QueryRequest["baseEntity"], requiredPaths: Set<string>): Promise<BaseRow[]> {
  const tenantId = await getTenantId();
  switch (entity) {
    case "opportunities": {
      const select = buildSelectForOpportunities(requiredPaths);
      try {
        let q = supabase
          .from("opportunity")
          .select(select)
          .order("created_at", { ascending: false });
        if (tenantId) q = q.eq("tenant_id", tenantId);
        const { data, error } = await q;
        if (error) throw error;
        return (data || []) as unknown as BaseRow[];
      } catch {
        try {
          // Some environments don't expose a direct owner relation for this table.
          // Fall back to a query without the owner join so list data still loads.
          const selectWithoutOwner = select.replace(/,\s*owner:owner_user_id\([^)]+\)/, "");
          let q = supabase
            .from("opportunity")
            .select(selectWithoutOwner)
            .order("created_at", { ascending: false });
          if (tenantId) q = q.eq("tenant_id", tenantId);
          const { data, error } = await q;
          if (error) throw error;
          return (data || []) as unknown as BaseRow[];
        } catch {
          // Last-resort fallback for restricted relation access: base table only.
          let q = supabase.from("opportunity").select("*").order("created_at", { ascending: false });
          if (tenantId) q = q.eq("tenant_id", tenantId);
          const { data, error } = await q;
          if (error) throw error;
          return (data || []) as unknown as BaseRow[];
        }
      }
    }
    case "accounts": {
      const base = Array.from(requiredPaths).filter((path) => !path.includes("."));
      const select = Array.from(new Set(["account_id", "tenant_id", "created_at", ...base])).join(",");
      let q = supabase.from("account").select(select).order("created_at", { ascending: false });
      if (tenantId) q = q.eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as BaseRow[];
    }
    case "contacts": {
      const select = buildSelectForContacts(requiredPaths);
      let q = supabase
        .from("contact")
        .select(select)
        .order("created_at", { ascending: false });
      if (tenantId) q = q.eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as BaseRow[];
    }
    case "projects": {
      const select = buildSelectForProjects(requiredPaths);
      try {
        let q = supabase
          .from("project" as any)
          .select(select)
          .order("created_at", { ascending: false });
        if (tenantId) q = q.eq("tenant_id", tenantId);
        const { data, error } = await q;
        if (error) throw error;
        return (data || []) as unknown as BaseRow[];
      } catch {
        const base = Array.from(requiredPaths).filter((path) => !path.includes("."));
        const safeSelect = Array.from(new Set(["project_id", "tenant_id", "created_at", ...base])).join(",");
        let q = supabase.from("project_safe" as any).select(safeSelect).order("created_at", { ascending: false });
        if (tenantId) q = q.eq("tenant_id", tenantId);
        const { data, error } = await q;
        if (error) throw error;
        return (data || []) as unknown as BaseRow[];
      }
    }
    case "leads": {
      const select = buildSelectGeneric("lead_id", requiredPaths, [
        { prefix: "account", foreignKey: "account_id" },
      ]);
      let q = supabase.from("lead" as any).select(select).order("created_at", { ascending: false });
      if (tenantId) q = q.eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as BaseRow[];
    }
    case "quotes": {
      const select = buildSelectGeneric("quote_id", requiredPaths, [
        { prefix: "opportunity", foreignKey: "opportunity_id" },
      ]);
      let q = supabase.from("quote" as any).select(select).order("created_at", { ascending: false });
      if (tenantId) q = q.eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as BaseRow[];
    }
    case "contracts": {
      const select = buildSelectGeneric("contract_id", requiredPaths, [
        { prefix: "account", foreignKey: "account_id" },
        { prefix: "opportunity", foreignKey: "opportunity_id" },
      ]);
      let q = supabase.from("contract" as any).select(select).order("created_at", { ascending: false });
      if (tenantId) q = q.eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as BaseRow[];
    }
    case "invoices": {
      const select = buildSelectGeneric("invoice_id", requiredPaths, [
        { prefix: "account", foreignKey: "account_id" },
        { prefix: "contract", foreignKey: "contract_id" },
      ]);
      let q = supabase.from("invoice" as any).select(select).order("created_at", { ascending: false });
      if (tenantId) q = q.eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as BaseRow[];
    }
    case "measures": {
      const select = buildSelectGeneric("measure_id", requiredPaths, [
        { prefix: "account", foreignKey: "account_id" },
      ]);
      let q = supabase.from("measure" as any).select(select).order("created_at", { ascending: false });
      if (tenantId) q = q.eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as BaseRow[];
    }
    case "buildings": {
      const base = Array.from(requiredPaths).filter((p) => !p.includes("."));
      const select = Array.from(new Set(["building_id", "tenant_id", "created_at", ...base])).join(",");
      let q = supabase.from("building" as any).select(select).order("created_at", { ascending: false });
      if (tenantId) q = q.eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as BaseRow[];
    }
    case "activities": {
      const select = buildSelectGeneric("activity_id", requiredPaths, [
        { prefix: "owner", foreignKey: "owner_user_id" },
      ]);
      let q = supabase.from("activity" as any).select(select).order("created_at", { ascending: false });
      if (tenantId) q = q.eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as BaseRow[];
    }
    case "connections": {
      const select = buildSelectGeneric("connection_id", requiredPaths, [
        { prefix: "account", foreignKey: "account_id" },
        { prefix: "contact", foreignKey: "contact_id" },
        { prefix: "owner", foreignKey: "owner_user_id" },
      ]);
      let q = supabase.from("connection" as any).select(select).order("created_at", { ascending: false });
      if (tenantId) q = q.eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as BaseRow[];
    }
    case "commission_splits": {
      const select = buildSelectGeneric("commission_split_id", requiredPaths, [
        { prefix: "contract", foreignKey: "contract_id" },
        { prefix: "contact", foreignKey: "contact_id" },
      ]);
      let q = supabase.from("commission_split" as any).select(select).order("created_at", { ascending: false });
      if (tenantId) q = q.eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as BaseRow[];
    }
    default:
      return [];
  }
}

async function queryDirect(payload: QueryRequest): Promise<QueryResponse> {
  const start = performance.now();
  const requiredPaths = computeRequiredPaths(payload);
  let rows = await fetchRows(payload.baseEntity, requiredPaths);
  rows = applyFilterGroup(rows, payload.filters);

  if (payload.sorts?.[0]) {
    const { path, dir } = payload.sorts[0];
    rows.sort((a, b) => {
      const av = getByPath(a, path);
      const bv = getByPath(b, path);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return dir === "asc" ? av - bv : bv - av;
      return dir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }

  const computedMap = new Map((payload.computed ?? []).map((c) => [c.id, c]));
  const projected = rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const col of payload.columns) {
      const computed = computedMap.get(col.id);
      out[col.id] = computed ? evalComputed(computed.expression, row) : getByPath(row, col.path);
    }
    return out;
  });

  const page = payload.pagination?.page ?? 1;
  const pageSize = payload.pagination?.pageSize ?? 50;
  const startIdx = (page - 1) * pageSize;
  const paged = projected.slice(startIdx, startIdx + pageSize);

  const grandTotals: Record<string, unknown> = {};
  if (payload.totals) {
    for (const col of payload.columns) {
      const vals = projected.map((r) => r[col.id]).filter((v) => typeof v === "number") as number[];
      if (!vals.length) continue;
      const sum = vals.reduce((acc, v) => acc + v, 0);
      grandTotals[col.id] = col.aggregation === "avg" ? sum / vals.length : sum;
    }
  }

  return {
    rows: paged,
    summaries: { groups: [], grandTotals },
    pageInfo: { page, pageSize, totalRows: projected.length },
    diagnostics: {
      executionMs: Math.round(performance.now() - start),
      prunedColumns: [],
      warnings: ["Using direct Supabase fallback mode"],
      joinCount: 1,
    },
  };
}

function loadLocalSavedViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(LOCAL_SAVED_VIEWS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedView[];
  } catch {
    return [];
  }
}

function saveLocalSavedViews(views: SavedView[]) {
  localStorage.setItem(LOCAL_SAVED_VIEWS_KEY, JSON.stringify(views));
}

function uid() {
  return `view_${Math.random().toString(36).slice(2, 10)}`;
}

type SavedViewDbRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  config: Record<string, unknown>;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
};

function mapSavedViewDbRow(row: SavedViewDbRow): SavedView | null {
  const cfg = row.config || {};
  const baseEntity = cfg.baseEntity as BaseEntity | undefined;
  const definition = cfg.definition as QueryRequest | undefined;
  if (!baseEntity || !definition) return null;
  return {
    id: row.id,
    baseEntity,
    name: row.name,
    description: row.description ?? undefined,
    scope: row.is_shared ? "ORG" : "PRIVATE",
    definition,
    ownerId: row.user_id,
    teamId: String((cfg.teamId as string | undefined) ?? "team-default"),
    orgId: String((cfg.orgId as string | undefined) ?? "org-default"),
    isDefault: Boolean(cfg.isDefault ?? false),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listSavedViewsFromSupabase(baseEntity: string): Promise<SavedView[]> {
  const { data, error } = await supabase
    .from("saved_views")
    .select("id,user_id,name,description,config,is_shared,created_at,updated_at")
    .contains("config", { baseEntity })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return ((data || []) as SavedViewDbRow[])
    .map(mapSavedViewDbRow)
    .filter((v): v is SavedView => Boolean(v));
}

async function createSavedViewInSupabase(payload: {
  baseEntity: string;
  name: string;
  description?: string;
  scope: "PRIVATE" | "TEAM" | "ORG";
  definition: QueryRequest;
  isDefault?: boolean;
}): Promise<SavedView> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("Not signed in");
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error("Tenant not found");

  const insert = {
    tenant_id: tenantId,
    user_id: userId,
    name: payload.name,
    description: payload.description ?? null,
    is_shared: payload.scope !== "PRIVATE",
    config: {
      baseEntity: payload.baseEntity,
      definition: payload.definition,
      scope: payload.scope,
      isDefault: Boolean(payload.isDefault ?? false),
    },
  };

  const { data, error } = await supabase
    .from("saved_views")
    .insert(insert)
    .select("id,user_id,name,description,config,is_shared,created_at,updated_at")
    .single();
  if (error) throw error;
  const mapped = mapSavedViewDbRow(data as SavedViewDbRow);
  if (!mapped) throw new Error("Failed to map saved view");
  return mapped;
}

async function updateSavedViewInSupabase(
  id: string,
  payload: {
    baseEntity: string;
    name: string;
    description?: string;
    scope: "PRIVATE" | "TEAM" | "ORG";
    definition: QueryRequest;
    isDefault?: boolean;
  }
): Promise<SavedView> {
  const update = {
    name: payload.name,
    description: payload.description ?? null,
    is_shared: payload.scope !== "PRIVATE",
    config: {
      baseEntity: payload.baseEntity,
      definition: payload.definition,
      scope: payload.scope,
      isDefault: Boolean(payload.isDefault ?? false),
    },
  };

  const { data, error } = await supabase
    .from("saved_views")
    .update(update)
    .eq("id", id)
    .select("id,user_id,name,description,config,is_shared,created_at,updated_at")
    .single();
  if (error) throw error;
  const mapped = mapSavedViewDbRow(data as SavedViewDbRow);
  if (!mapped) throw new Error("Failed to map saved view");
  return mapped;
}

function asCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.split('"').join('""')}"` : s;
  };
  const header = columns.map(esc).join(",");
  const lines = rows.map((r) => columns.map((c) => esc(r[c])).join(","));
  return [header, ...lines].join("\n");
}

function download(content: string, type: "csv" | "xlsx") {
  const blob = new Blob([content], {
    type: type === "csv" ? "text/csv;charset=utf-8" : "application/vnd.ms-excel",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `view-export.${type}`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function getEntityMetadata(entity: string) {
  if (!VIEW_SERVER_ENABLED) {
    return localMetadata[entity] ?? localMetadata.opportunities;
  }
  try {
    return await request<EntityMetadata>(`/api/views/metadata/${entity}`);
  } catch (error) {
    if (!shouldUseFallback(error)) throw error;
    return localMetadata[entity] ?? localMetadata.opportunities;
  }
}

export async function queryView(payload: QueryRequest) {
  if (!VIEW_SERVER_ENABLED) {
    return queryDirect(payload);
  }
  try {
    return await request<QueryResponse>("/api/views/query", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (!shouldUseFallback(error)) throw error;
    return queryDirect(payload);
  }
}

export async function listSavedViews(baseEntity: string) {
  try {
    return await listSavedViewsFromSupabase(baseEntity);
  } catch {
    // fall through to API/local
  }
  if (!VIEW_SERVER_ENABLED) {
    return loadLocalSavedViews().filter((v) => v.baseEntity === baseEntity);
  }
  try {
    return await request<SavedView[]>(`/api/views/saved?baseEntity=${baseEntity}`);
  } catch (error) {
    if (!shouldUseFallback(error)) throw error;
    return loadLocalSavedViews().filter((v) => v.baseEntity === baseEntity);
  }
}

export async function createSavedView(payload: {
  baseEntity: string;
  name: string;
  description?: string;
  scope: "PRIVATE" | "TEAM" | "ORG";
  definition: QueryRequest;
  isDefault?: boolean;
}) {
  try {
    return await createSavedViewInSupabase(payload);
  } catch {
    // fall through to API/local
  }
  if (!VIEW_SERVER_ENABLED) {
    const now = new Date().toISOString();
    const saved: SavedView = {
      id: uid(),
      baseEntity: payload.baseEntity as SavedView["baseEntity"],
      name: payload.name,
      description: payload.description,
      scope: payload.scope,
      definition: payload.definition,
      ownerId: "local-user",
      teamId: "local-team",
      orgId: "local-org",
      isDefault: payload.isDefault ?? false,
      createdAt: now,
      updatedAt: now,
    };
    const views = loadLocalSavedViews();
    views.push(saved);
    saveLocalSavedViews(views);
    return saved;
  }
  try {
    return await request<SavedView>("/api/views/saved", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (!shouldUseFallback(error)) throw error;
    const now = new Date().toISOString();
    const saved: SavedView = {
      id: uid(),
      baseEntity: payload.baseEntity as SavedView["baseEntity"],
      name: payload.name,
      description: payload.description,
      scope: payload.scope,
      definition: payload.definition,
      ownerId: "local-user",
      teamId: "local-team",
      orgId: "local-org",
      isDefault: payload.isDefault ?? false,
      createdAt: now,
      updatedAt: now,
    };
    const views = loadLocalSavedViews();
    views.push(saved);
    saveLocalSavedViews(views);
    return saved;
  }
}

export async function updateSavedView(
  id: string,
  payload: {
    baseEntity: string;
    name: string;
    description?: string;
    scope: "PRIVATE" | "TEAM" | "ORG";
    definition: QueryRequest;
    isDefault?: boolean;
  }
) {
  try {
    return await updateSavedViewInSupabase(id, payload);
  } catch {
    // fall through to API/local
  }
  if (!VIEW_SERVER_ENABLED) {
    const views = loadLocalSavedViews();
    const idx = views.findIndex((v) => v.id === id);
    if (idx < 0) throw new Error("View not found");
    views[idx] = {
      ...views[idx],
      ...payload,
      baseEntity: payload.baseEntity as SavedView["baseEntity"],
      updatedAt: new Date().toISOString(),
    };
    saveLocalSavedViews(views);
    return views[idx];
  }
  try {
    return await request<SavedView>(`/api/views/saved/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (!shouldUseFallback(error)) throw error;
    const views = loadLocalSavedViews();
    const idx = views.findIndex((v) => v.id === id);
    if (idx < 0) throw new Error("View not found");
    views[idx] = {
      ...views[idx],
      ...payload,
      baseEntity: payload.baseEntity as SavedView["baseEntity"],
      updatedAt: new Date().toISOString(),
    };
    saveLocalSavedViews(views);
    return views[idx];
  }
}

export async function deleteSavedView(id: string) {
  try {
    const { error } = await supabase.from("saved_views").delete().eq("id", id);
    if (!error) return;
  } catch {
    // fall through
  }
  if (!VIEW_SERVER_ENABLED) {
    saveLocalSavedViews(loadLocalSavedViews().filter((v) => v.id !== id));
    return;
  }
  try {
    return await request<void>(`/api/views/saved/${id}`, { method: "DELETE" });
  } catch (error) {
    if (!shouldUseFallback(error)) throw error;
    saveLocalSavedViews(loadLocalSavedViews().filter((v) => v.id !== id));
  }
}

export async function starSavedView(id: string) {
  try {
    const { data, error } = await supabase
      .from("saved_views")
      .select("id,is_shared,config")
      .eq("id", id)
      .single();
    if (!error && data) {
      const config = (data.config || {}) as Record<string, unknown>;
      const nextConfig = { ...config, starred: !(config.starred as boolean | undefined) };
      const { error: updateError } = await supabase.from("saved_views").update({ config: nextConfig }).eq("id", id);
      if (!updateError) return { starred: Boolean(nextConfig.starred) };
    }
  } catch {
    // fall through
  }
  if (!VIEW_SERVER_ENABLED) {
    return { starred: true };
  }
  try {
    return await request<{ starred: boolean }>(`/api/views/saved/${id}/star`, { method: "POST" });
  } catch (error) {
    if (!shouldUseFallback(error)) throw error;
    return { starred: true };
  }
}

export async function exportView(type: "csv" | "xlsx", payload: QueryRequest) {
  if (!VIEW_SERVER_ENABLED) {
    const result = await queryDirect(payload);
    const headers = payload.columns.map((c) => c.label ?? c.path);
    const keyByHeader = payload.columns.map((c) => c.id);
    const mapped = result.rows.map((r) => {
      const out: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        out[h] = r[keyByHeader[i]];
      });
      return out;
    });
    const csv = asCsv(mapped, headers);
    download(csv, type);
    return;
  }
  try {
    const token = await getToken();
    const response = await fetch(`${API_BASE}/api/views/export/${type}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(await response.text());

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `view-export.${type}`;
    anchor.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    if (!shouldUseFallback(error)) throw error;
    const result = await queryDirect(payload);
    const headers = payload.columns.map((c) => c.label ?? c.path);
    const keyByHeader = payload.columns.map((c) => c.id);
    const mapped = result.rows.map((r) => {
      const out: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        out[h] = r[keyByHeader[i]];
      });
      return out;
    });
    const csv = asCsv(mapped, headers);
    download(csv, type);
  }
}
