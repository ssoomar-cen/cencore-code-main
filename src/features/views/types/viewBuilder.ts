export type BaseEntity =
  | "opportunities"
  | "accounts"
  | "contacts"
  | "leads"
  | "quotes"
  | "contracts"
  | "invoices"
  
  | "measures"
  | "buildings"
  | "activities"
  | "connections"
  | "commission_splits";

export type Aggregation =
  | "count"
  | "distinctCount"
  | "sum"
  | "avg"
  | "min"
  | "max";

export interface ViewColumn {
  id: string;
  path: string;
  label?: string;
  aggregation?: Aggregation;
  width?: number;
  pin?: "left" | "right";
}

export interface ViewSort {
  path: string;
  dir: "asc" | "desc";
}

export interface FilterRule {
  path: string;
  op: "eq" | "neq" | "contains" | "in" | "between" | "gt" | "gte" | "lt" | "lte" | "isNull" | "notNull";
  value?: unknown;
}

export interface FilterGroup {
  op: "and" | "or";
  filters: Array<FilterGroup | FilterRule>;
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

export interface QueryResponse {
  rows: Record<string, unknown>[];
  pageInfo: {
    page: number;
    pageSize: number;
    totalRows: number;
  };
}

export interface EntityMetadata {
  entity: BaseEntity;
  fields: Array<{ path: string; label: string; type: string }>;
  relations: Array<{ name: string; toEntity: string; cardinality: "one" | "many" }>;
}

export type ViewSharing = "PRIVATE" | "TEAM" | "ORG";

export interface SavedView {
  id: string;
  baseEntity: BaseEntity;
  name: string;
  description?: string;
  scope: ViewSharing;
  definition: QueryRequest;
  starred?: boolean;
  createdAt: string;
}
