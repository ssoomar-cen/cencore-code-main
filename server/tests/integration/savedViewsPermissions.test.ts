import { describe, expect, it } from "vitest";
import { canManageView, canReadView } from "../../src/services/viewPermissions.js";

describe("view permissions", () => {
  const admin = { id: "admin", role: "ADMIN", teamId: "t1", orgId: "org", email: "a@x.com" } as const;
  const manager = { id: "manager", role: "MANAGER", teamId: "t1", orgId: "org", email: "m@x.com" } as const;
  const viewer = { id: "viewer", role: "VIEWER", teamId: "t2", orgId: "org", email: "v@x.com" } as const;

  it("allows admin to read org views", () => {
    expect(canReadView("ORG", "owner", "t1", admin)).toBe(true);
  });

  it("allows team scope for same team", () => {
    expect(canReadView("TEAM", "owner", "t1", manager)).toBe(true);
    expect(canReadView("TEAM", "owner", "t1", viewer)).toBe(false);
  });

  it("only owner or admin for management", () => {
    expect(canManageView("PRIVATE", "viewer", viewer)).toBe(true);
    expect(canManageView("ORG", "owner", admin)).toBe(true);
    expect(canManageView("ORG", "owner", manager)).toBe(false);
  });
});
