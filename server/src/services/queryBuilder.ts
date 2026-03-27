import { env } from "../config/env.js";
import { db } from "../utils/prisma.js";
import {
  Aggregation,
  AuthUser,
  BaseEntity,
  FilterGroup,
  FilterRule,
  QueryRequest,
  QueryResult,
  ViewColumn,
} from "../types/view.js";
import { ENTITY_DEFS, EntityDef, EntityKey, RelationDef, fieldForPath, getEntityDef } from "./entityMetadata.js";
import { aggregationSql, compileComputedField } from "./queryFormula.js";

const MAX_JOINS = 8;
const MAX_COLUMNS = 40;
const MAX_GROUP_FIELDS = 5;
const MAX_DEPTH = 2;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 500;

interface BuiltFilter {
  sql: string;
  params: unknown[];
}

interface JoinCtx {
  joins: Map<string, string>;
  joinCount: number;
}

interface ResolvedPath {
  sql: string;
  type: string;
  label: string;
  path: string;
}

const safeIdentifier = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function assertSafeAlias(alias: string) {
  if (!safeIdentifier.test(alias)) {
    throw new Error(`Invalid alias: ${alias}`);
  }
}

function asPgParams(raw: unknown[]): string[] {
  return raw.map((_, i) => `$${i + 1}`);
}

function quoteAlias(alias: string): string {
  assertSafeAlias(alias);
  return `"${alias}"`;
}

function normalizeAggregation(aggregation?: Aggregation): Aggregation | undefined {
  if (!aggregation) return undefined;
  return aggregation;
}


function buildRowSecurity(entity: BaseEntity, user: AuthUser): BuiltFilter {
  const root = getEntityDef(entity);

  if (user.role === "ADMIN") {
    return { sql: `${root.alias}.org_id = $1`, params: [user.orgId] };
  }

  if (user.role === "MANAGER") {
    return {
      sql: `${root.alias}.org_id = $1 AND ${root.alias}.team_id = $2`,
      params: [user.orgId, user.teamId],
    };
  }

  if (entity === "opportunities") {
    return {
      sql: `${root.alias}.org_id = $1 AND ${root.alias}.owner_id = $2`,
      params: [user.orgId, user.id],
    };
  }

  return {
    sql: `${root.alias}.org_id = $1 AND ${root.alias}.team_id = $2`,
    params: [user.orgId, user.teamId],
  };
}

function tokenizePath(path: string): string[] {
  return path.split(".").filter(Boolean);
}

function resolvePath(
  baseEntity: BaseEntity,
  rawPath: string,
  joinCtx: JoinCtx,
  computedSqlById: Map<string, string>,
  role: AuthUser["role"]
): ResolvedPath {
  const parts = tokenizePath(rawPath);
  if (parts.length === 0) {
    throw new Error(`Invalid field path: ${rawPath}`);
  }

  if (parts.length === 1 && computedSqlById.has(parts[0])) {
    return {
      sql: computedSqlById.get(parts[0])!,
      type: "number",
      label: parts[0],
      path: rawPath,
    };
  }

  let currentEntity: EntityKey = baseEntity;
  let currentAlias = ENTITY_DEFS[currentEntity].alias;
  let depth = 0;

  for (let i = 0; i < parts.length - 1; i += 1) {
    const relName = parts[i];
    const entityDef: EntityDef = ENTITY_DEFS[currentEntity];
    const rel: RelationDef | undefined = entityDef.relations.find((r: RelationDef) => r.name === relName);
    if (!rel) {
      throw new Error(`Unknown relation '${relName}' for '${currentEntity}' in path '${rawPath}'`);
    }

    depth += 1;
    if (depth > MAX_DEPTH) {
      throw new Error(`Path depth > ${MAX_DEPTH} is not allowed: '${rawPath}'`);
    }

    const aliasKey = parts.slice(0, i + 1).join("_");
    if (!joinCtx.joins.has(aliasKey)) {
      const joinAlias = aliasKey;
      assertSafeAlias(joinAlias);
      const sqlOn = rel.on
        .replaceAll(entityDef.alias, currentAlias)
        .replaceAll(rel.name, joinAlias)
        .replaceAll(ENTITY_DEFS[rel.toEntity as EntityKey].alias, joinAlias);
      const joinKeyword = rel.joinType === "inner" ? "INNER JOIN" : "LEFT JOIN";
      const targetTable = ENTITY_DEFS[rel.toEntity as EntityKey].table;
      joinCtx.joins.set(aliasKey, `${joinKeyword} ${targetTable} ${joinAlias} ON ${sqlOn}`);
      joinCtx.joinCount += 1;
    }

    currentAlias = aliasKey;
    currentEntity = rel.toEntity as EntityKey;
  }

  const last = parts[parts.length - 1];
  const field = fieldForPath(currentEntity, last);
  if (!field) {
    throw new Error(`Unknown field '${last}' on '${currentEntity}' in path '${rawPath}'`);
  }
  if (field.roles && !field.roles.includes(role)) {
    throw new Error(`Field '${rawPath}' is not allowed for role '${role}'`);
  }

  return {
    sql: field.sql.replace(`${ENTITY_DEFS[currentEntity].alias}.`, `${currentAlias}.`),
    type: field.type,
    label: field.label,
    path: rawPath,
  };
}

function compileFilter(
  group: FilterGroup,
  baseEntity: BaseEntity,
  joinCtx: JoinCtx,
  computedSqlById: Map<string, string>,
  role: AuthUser["role"]
): BuiltFilter {
  const clauses: string[] = [];
  const params: unknown[] = [];

  for (const filter of group.filters) {
    if ("filters" in filter) {
      const nested = compileFilter(filter, baseEntity, joinCtx, computedSqlById, role);
      clauses.push(`(${nested.sql})`);
      params.push(...nested.params);
      continue;
    }

    const compiledRule = compileRule(filter, baseEntity, joinCtx, computedSqlById, role, params.length + 1);
    clauses.push(compiledRule.sql);
    params.push(...compiledRule.params);
  }

  if (clauses.length === 0) {
    return { sql: "TRUE", params: [] };
  }

  return {
    sql: clauses.join(` ${group.op.toUpperCase()} `),
    params,
  };
}

function compileRule(
  rule: FilterRule,
  baseEntity: BaseEntity,
  joinCtx: JoinCtx,
  computedSqlById: Map<string, string>,
  role: AuthUser["role"],
  offset: number
): BuiltFilter {
  const resolved = resolvePath(baseEntity, rule.path, joinCtx, computedSqlById, role);
  const sql = resolved.sql;

  switch (rule.op) {
    case "eq":
      return { sql: `${sql} = $${offset}`, params: [rule.value] };
    case "neq":
      return { sql: `${sql} <> $${offset}`, params: [rule.value] };
    case "contains":
      return { sql: `${sql} ILIKE $${offset}`, params: [`%${String(rule.value ?? "")}%`] };
    case "in": {
      const values = Array.isArray(rule.value) ? rule.value : [];
      if (values.length === 0) return { sql: "FALSE", params: [] };
      const placeholders = values.map((_, index) => `$${offset + index}`).join(", ");
      return { sql: `${sql} IN (${placeholders})`, params: values };
    }
    case "between": {
      const [from, to] = Array.isArray(rule.value) ? rule.value : [null, null];
      return { sql: `${sql} BETWEEN $${offset} AND $${offset + 1}`, params: [from, to] };
    }
    case "gt":
      return { sql: `${sql} > $${offset}`, params: [rule.value] };
    case "gte":
      return { sql: `${sql} >= $${offset}`, params: [rule.value] };
    case "lt":
      return { sql: `${sql} < $${offset}`, params: [rule.value] };
    case "lte":
      return { sql: `${sql} <= $${offset}`, params: [rule.value] };
    case "isNull":
      return { sql: `${sql} IS NULL`, params: [] };
    case "notNull":
      return { sql: `${sql} IS NOT NULL`, params: [] };
    case "dateRange": {
      const [start, end] = Array.isArray(rule.value) ? rule.value : [null, null];
      return {
        sql: `${sql} >= $${offset}::date AND ${sql} <= $${offset + 1}::date`,
        params: [start, end],
      };
    }
    default:
      throw new Error(`Unsupported filter op: ${rule.op}`);
  }
}


function buildSelectColumns(
  request: QueryRequest,
  role: AuthUser["role"],
  joinCtx: JoinCtx,
  warnings: string[]
): {
  selectParts: string[];
  prunedColumns: string[];
  computedSqlById: Map<string, string>;
} {
  const computedSqlById = new Map<string, string>();
  const baseEntity = request.baseEntity;

  const resolver = (path: string) => resolvePath(baseEntity, path, joinCtx, computedSqlById, role).sql;

  (request.computed ?? []).forEach((computed) => {
    const sql = compileComputedField(computed, resolver);
    computedSqlById.set(computed.id, sql);
  });

  const selectParts: string[] = [];
  const prunedColumns: string[] = [];

  request.columns.forEach((column) => {
    try {
      const resolved = resolvePath(baseEntity, column.path, joinCtx, computedSqlById, role);
      const aggregation = normalizeAggregation(column.aggregation);
      const expression = aggregation ? aggregationSql(aggregation, resolved.sql) : resolved.sql;
      selectParts.push(`${expression} AS ${quoteAlias(column.id)}`);
    } catch (error) {
      prunedColumns.push(column.id);
      warnings.push((error as Error).message);
    }
  });

  return { selectParts, prunedColumns, computedSqlById };
}

function validateCost(request: QueryRequest, joinCount: number): string[] {
  const warnings: string[] = [];
  if (joinCount > MAX_JOINS) {
    throw new Error(`Join limit exceeded: ${joinCount}/${MAX_JOINS}`);
  }
  if (request.columns.length > MAX_COLUMNS) {
    warnings.push(`Requested ${request.columns.length} columns, max recommended is ${MAX_COLUMNS}`);
  }
  if ((request.groupBy?.length ?? 0) > MAX_GROUP_FIELDS) {
    throw new Error(`groupBy fields exceed limit ${MAX_GROUP_FIELDS}`);
  }
  return warnings;
}

async function countTotalRows(
  fromAndJoins: string,
  whereSql: string,
  params: unknown[]
): Promise<number> {
  const placeholders = asPgParams(params);
  let countSql = `SELECT COUNT(*)::int AS total FROM ${fromAndJoins} WHERE ${whereSql}`;
  placeholders.forEach((ph, idx) => {
    countSql = countSql.replace(new RegExp(`\\$${idx + 1}`, "g"), ph);
  });
  const result = await db.query<{ total: number }>(countSql, params);
  return result[0]?.total ?? 0;
}

function buildSummarySql(request: QueryRequest, selectColumns: ViewColumn[]): string[] {
  const parts: string[] = [];
  for (const col of selectColumns) {
    if (!col.aggregation) continue;
    parts.push(`${aggregationSql(col.aggregation, quoteAlias(col.id))} AS ${quoteAlias(`${col.id}_${col.aggregation}`)}`);
  }
  return parts;
}

export async function executeViewQuery(request: QueryRequest, user: AuthUser): Promise<QueryResult> {
  const start = Date.now();

  const page = Math.max(1, request.pagination?.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, request.pagination?.pageSize ?? DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * pageSize;

  const joinCtx: JoinCtx = { joins: new Map(), joinCount: 0 };
  const warnings: string[] = [];
  const { selectParts, prunedColumns, computedSqlById } = buildSelectColumns(request, user.role, joinCtx, warnings);

  if (selectParts.length === 0) {
    throw new Error("No selectable columns after RBAC/validation");
  }

  const extraWarnings = validateCost(request, joinCtx.joinCount);
  warnings.push(...extraWarnings);

  const securityFilter = buildRowSecurity(request.baseEntity, user);

  const customFilter = request.filters
    ? compileFilter(request.filters, request.baseEntity, joinCtx, computedSqlById, user.role)
    : { sql: "TRUE", params: [] };

  const fromEntity = getEntityDef(request.baseEntity);
  const fromAndJoins = `${fromEntity.table} ${fromEntity.alias} ${Array.from(joinCtx.joins.values()).join(" ")}`.trim();

  const whereClauses = [securityFilter.sql, customFilter.sql].filter(Boolean);
  const whereSql = whereClauses.length ? whereClauses.join(" AND ") : "TRUE";
  const whereParams = [...securityFilter.params, ...customFilter.params];

  const groupBySql = (request.groupBy ?? [])
    .map((path) => resolvePath(request.baseEntity, path, joinCtx, computedSqlById, user.role).sql)
    .join(", ");

  const sorts = (request.sorts ?? [])
    .map((sort) => {
      const resolved = resolvePath(request.baseEntity, sort.path, joinCtx, computedSqlById, user.role);
      return `${resolved.sql} ${sort.dir.toUpperCase() === "DESC" ? "DESC" : "ASC"}`;
    })
    .join(", ");

  let sql = `SELECT ${selectParts.join(", ")} FROM ${fromAndJoins} WHERE ${whereSql}`;
  if (groupBySql) sql += ` GROUP BY ${groupBySql}`;
  if (sorts) sql += ` ORDER BY ${sorts}`;
  sql += ` LIMIT ${pageSize} OFFSET ${offset}`;

  const timeoutMs = env.QUERY_TIMEOUT_MS;
  await db.execute(`SET LOCAL statement_timeout = ${timeoutMs}`);

  const rows = await db.query<Record<string, unknown>>(sql, whereParams);
  const totalRows = await countTotalRows(fromAndJoins, whereSql, whereParams);

  const grandTotals: Record<string, unknown> = {};
  if (request.totals) {
    const summaryCols = buildSummarySql(request, request.columns);
    if (summaryCols.length > 0) {
      const summarySql = `SELECT ${summaryCols.join(", ")} FROM (SELECT ${selectParts.join(", ")} FROM ${fromAndJoins} WHERE ${whereSql}) summary`;
      const totalRowsRaw = await db.query<Record<string, unknown>>(summarySql, whereParams);
      Object.assign(grandTotals, totalRowsRaw[0] ?? {});
    }
  }

  const result: QueryResult = {
    rows,
    summaries: {
      groups: [],
      grandTotals,
    },
    pageInfo: {
      page,
      pageSize,
      totalRows,
    },
    diagnostics: {
      executionMs: Date.now() - start,
      prunedColumns,
      warnings,
      joinCount: joinCtx.joinCount,
    },
  };

  return result;
}
