export type BaseEntity = "opportunities" | "accounts" | "contacts" | "products";

export type Aggregation =
  | "count"
  | "distinctCount"
  | "sum"
  | "avg"
  | "min"
  | "max"
  | "median"
  | "percentile25"
  | "percentile50"
  | "percentile75"
  | "stddev";

export type FilterOp =
  | "eq"
  | "neq"
  | "contains"
  | "in"
  | "between"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "isNull"
  | "notNull"
  | "dateRange";

export type SortDir = "asc" | "desc";

export interface ViewColumn {
  id: string;
  label?: string;
  path: string;
  aggregation?: Aggregation;
  width?: number;
  pin?: "left" | "right";
}

export interface ViewSort {
  path: string;
  dir: SortDir;
}

export interface FilterRule {
  path: string;
  op: FilterOp;
  value?: unknown;
}

export interface FilterGroup {
  op: "and" | "or";
  filters: Array<FilterRule | FilterGroup>;
}

export interface ComputedField {
  id: string;
  label: string;
  expression: string;
}

export interface QueryRequest {
  baseEntity: BaseEntity;
  columns: ViewColumn[];
  filters?: FilterGroup;
  sorts?: ViewSort[];
  groupBy?: string[];
  computed?: ComputedField[];
  pagination?: {
    page: number;
    pageSize: number;
  };
  totals?: boolean;
}

export interface QueryResult {
  rows: Record<string, unknown>[];
  summaries: {
    groups: Record<string, unknown>[];
    grandTotals: Record<string, unknown>;
  };
  pageInfo: {
    page: number;
    pageSize: number;
    totalRows: number;
  };
  diagnostics: {
    executionMs: number;
    prunedColumns: string[];
    warnings: string[];
    joinCount: number;
  };
}

export interface AuthUser {
  id: string;
  role: "ADMIN" | "MANAGER" | "VIEWER";
  teamId: string;
  orgId: string;
  email: string;
  name?: string;
}