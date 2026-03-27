import { AuthUser } from "../types/view.js";

export type ViewScope = "PRIVATE" | "TEAM" | "ORG";

export function canReadView(scope: ViewScope, ownerId: string, teamId: string, user: AuthUser): boolean {
  if (user.role === "ADMIN") return true;
  if (ownerId === user.id) return true;
  if (scope === "ORG" && teamId && user.orgId) return true;
  if (scope === "TEAM" && teamId === user.teamId) return true;
  return false;
}

export function canManageView(scope: ViewScope, ownerId: string, user: AuthUser): boolean {
  if (ownerId === user.id) return true;
  if (user.role === "ADMIN" && scope === "ORG") return true;
  return false;
}