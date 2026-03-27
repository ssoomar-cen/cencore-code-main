import { z } from "zod";

export const baseEntitySchema = z.enum(["opportunities", "accounts", "contacts", "products"]);

const aggregationSchema = z
  .enum(["count", "distinctCount", "sum", "avg", "min", "max", "median", "percentile25", "percentile50", "percentile75", "stddev"])
  .optional();

export const viewColumnSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().optional(),
  path: z.string().min(1),
  aggregation: aggregationSchema,
  width: z.number().int().min(80).max(600).optional(),
  pin: z.enum(["left", "right"]).optional(),
});

const filterRuleSchema = z.object({
  path: z.string().min(1),
  op: z.enum(["eq", "neq", "contains", "in", "between", "gt", "gte", "lt", "lte", "isNull", "notNull", "dateRange"]),
  value: z.unknown().optional(),
});

export type FilterGroupInput = {
  op: "and" | "or";
  filters: Array<z.infer<typeof filterRuleSchema> | FilterGroupInput>;
};

export const filterGroupSchema: z.ZodType<FilterGroupInput> = z.lazy(() =>
  z.object({
    op: z.enum(["and", "or"]),
    filters: z.array(z.union([filterRuleSchema, filterGroupSchema])),
  })
);

export const queryRequestSchema = z.object({
  baseEntity: baseEntitySchema,
  columns: z.array(viewColumnSchema).min(1),
  filters: filterGroupSchema.optional(),
  sorts: z
    .array(
      z.object({
        path: z.string().min(1),
        dir: z.enum(["asc", "desc"]),
      })
    )
    .optional(),
  groupBy: z.array(z.string().min(1)).optional(),
  computed: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        label: z.string().min(1).max(120),
        expression: z.string().min(1).max(500),
      })
    )
    .optional(),
  pagination: z
    .object({
      page: z.number().int().min(1),
      pageSize: z.number().int().min(1).max(500),
    })
    .optional(),
  totals: z.boolean().optional(),
});

export const saveViewSchema = z.object({
  baseEntity: baseEntitySchema,
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  scope: z.enum(["PRIVATE", "TEAM", "ORG"]),
  definition: queryRequestSchema,
  isDefault: z.boolean().optional(),
});