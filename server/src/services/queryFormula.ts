import { Aggregation, ComputedField } from "../types/view.js";

export function aggregationSql(aggregation: Aggregation, fieldSql: string): string {
  switch (aggregation) {
    case "count":
      return `COUNT(${fieldSql})`;
    case "distinctCount":
      return `COUNT(DISTINCT ${fieldSql})`;
    case "sum":
      return `SUM(${fieldSql})`;
    case "avg":
      return `AVG(${fieldSql})`;
    case "min":
      return `MIN(${fieldSql})`;
    case "max":
      return `MAX(${fieldSql})`;
    case "median":
      return `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${fieldSql})`;
    case "percentile25":
      return `PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ${fieldSql})`;
    case "percentile50":
      return `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${fieldSql})`;
    case "percentile75":
      return `PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ${fieldSql})`;
    case "stddev":
      return `STDDEV_POP(${fieldSql})`;
    default:
      return fieldSql;
  }
}

export function compileComputedField(field: ComputedField, resolver: (path: string) => string): string {
  if (!/^[a-zA-Z0-9_\s().,+\-/*'%]+$/.test(field.expression)) {
    throw new Error(`Formula contains unsupported characters: ${field.id}`);
  }

  let sql = field.expression;

  sql = sql.replace(/\bdaysUntil\(([^)]+)\)/g, (_, arg) => `(DATE_PART('day', ${resolver(arg.trim())}::timestamp - NOW()))`);
  sql = sql.replace(/\bconcat\(([^)]+)\)/g, (_, args) => {
    const normalized = args
      .split(",")
      .map((value: string) => {
        const trimmed = value.trim();
        if (/^'.*'$/.test(trimmed)) return trimmed;
        return `COALESCE(${resolver(trimmed)}::text, '')`;
      })
      .join(", ");
    return `CONCAT(${normalized})`;
  });

  sql = sql.replace(/\b([a-zA-Z_][a-zA-Z0-9_.]*)\b/g, (match) => {
    if (["AND", "OR", "NULL", "COALESCE", "CONCAT", "NOW", "DATE_PART"].includes(match.toUpperCase())) {
      return match;
    }
    if (/^\d+$/.test(match)) {
      return match;
    }
    if (match.includes(".")) {
      return resolver(match);
    }
    return match;
  });

  return sql;
}