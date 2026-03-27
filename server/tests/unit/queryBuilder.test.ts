import { describe, expect, it } from "vitest";
import { aggregationSql, compileComputedField } from "../../src/services/queryFormula.js";

describe("queryBuilder", () => {
  it("builds aggregation SQL", () => {
    expect(aggregationSql("sum", "o.amount")).toBe("SUM(o.amount)");
    expect(aggregationSql("percentile75", "o.amount")).toContain("0.75");
  });

  it("compiles formula with concat and daysUntil", () => {
    const sql = compileComputedField(
      {
        id: "formula_1",
        label: "Formula",
        expression: "concat(account.name, ' - ', name)",
      },
      (path) => `RESOLVED_${path.replaceAll(".", "_")}`
    );

    expect(sql).toContain("CONCAT");
    expect(sql).toContain("RESOLVED_account_name");
  });

  it("rejects unsafe formula characters", () => {
    expect(() =>
      compileComputedField(
        {
          id: "formula_2",
          label: "Formula",
          expression: "name; DROP TABLE users",
        },
        (path) => path
      )
    ).toThrow();
  });
});
