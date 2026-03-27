import { AuthUser } from "../types/view.js";
import { db } from "../utils/prisma.js";
import { ViewScope } from "./viewPermissions.js";
export { canManageView, canReadView } from "./viewPermissions.js";

export interface SaveViewInput {
  baseEntity: string;
  name: string;
  description?: string;
  scope: ViewScope;
  definition: unknown;
  isDefault?: boolean;
}

export async function listViews(baseEntity: string, user: AuthUser) {
  const rows = await db.query<{
    id: string; baseEntity: string; name: string; description: string | null;
    scope: ViewScope; ownerId: string; teamId: string; orgId: string;
    definition: unknown; isDefault: boolean; createdAt: Date; updatedAt: Date;
    owner_id: string; owner_name: string; owner_email: string;
    starred: boolean;
  }>(
    `SELECT sv.*,
       u.id AS owner_id, u.name AS owner_name, u.email AS owner_email,
       EXISTS(SELECT 1 FROM view_favorites vf WHERE vf."viewId" = sv.id AND vf."userId" = $1) AS starred
     FROM saved_views sv
     LEFT JOIN users u ON u.id = sv."ownerId"
     WHERE sv."baseEntity" = $2
       AND sv."orgId" = $3
       AND (sv."ownerId" = $1 OR sv.scope = 'ORG' OR (sv.scope = 'TEAM' AND sv."teamId" = $4))
     ORDER BY sv."isDefault" DESC, sv."updatedAt" DESC`,
    [user.id, baseEntity, user.orgId, user.teamId]
  );

  return rows.map((r) => ({
    id: r.id,
    baseEntity: r.baseEntity,
    name: r.name,
    description: r.description,
    scope: r.scope,
    ownerId: r.ownerId,
    teamId: r.teamId,
    orgId: r.orgId,
    definition: r.definition,
    isDefault: r.isDefault,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    starred: r.starred,
    owner: { id: r.owner_id, name: r.owner_name, email: r.owner_email },
  }));
}

export async function getView(viewId: string) {
  const rows = await db.query<{
    id: string; baseEntity: string; name: string; description: string | null;
    scope: ViewScope; ownerId: string; teamId: string; orgId: string;
    definition: unknown; isDefault: boolean; createdAt: Date; updatedAt: Date;
    owner_id: string; owner_name: string; owner_email: string;
  }>(
    `SELECT sv.*, u.id AS owner_id, u.name AS owner_name, u.email AS owner_email
     FROM saved_views sv LEFT JOIN users u ON u.id = sv."ownerId"
     WHERE sv.id = $1`,
    [viewId]
  );
  const r = rows[0];
  if (!r) return null;
  return {
    ...r,
    owner: { id: r.owner_id, name: r.owner_name, email: r.owner_email },
  };
}

export async function createView(input: SaveViewInput, user: AuthUser) {
  if (input.isDefault) {
    await db.execute(
      `UPDATE saved_views SET "isDefault" = false WHERE "ownerId" = $1 AND "baseEntity" = $2`,
      [user.id, input.baseEntity]
    );
  }
  const rows = await db.query<{ id: string }>(
    `INSERT INTO saved_views ("baseEntity", name, description, scope, "ownerId", "teamId", "orgId", definition, "isDefault", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW()) RETURNING id`,
    [input.baseEntity, input.name, input.description ?? null, input.scope,
     user.id, user.teamId, user.orgId, JSON.stringify(input.definition), input.isDefault ?? false]
  );
  return getView(rows[0].id);
}

export async function updateView(viewId: string, input: SaveViewInput, user: AuthUser) {
  if (input.isDefault) {
    await db.execute(
      `UPDATE saved_views SET "isDefault" = false WHERE "ownerId" = $1 AND "baseEntity" = $2`,
      [user.id, input.baseEntity]
    );
  }
  await db.execute(
    `UPDATE saved_views SET name=$1, description=$2, scope=$3, definition=$4, "isDefault"=$5, "updatedAt"=NOW() WHERE id=$6`,
    [input.name, input.description ?? null, input.scope, JSON.stringify(input.definition), input.isDefault ?? false, viewId]
  );
  return getView(viewId);
}

export async function deleteView(viewId: string) {
  await db.execute(`DELETE FROM saved_views WHERE id = $1`, [viewId]);
}

export async function toggleStar(viewId: string, user: AuthUser) {
  const existing = await db.query<{ id: string }>(
    `SELECT id FROM view_favorites WHERE "viewId" = $1 AND "userId" = $2`,
    [viewId, user.id]
  );
  if (existing.length > 0) {
    await db.execute(`DELETE FROM view_favorites WHERE id = $1`, [existing[0].id]);
    return { starred: false };
  }
  await db.execute(
    `INSERT INTO view_favorites ("viewId", "userId", "createdAt") VALUES ($1, $2, NOW())`,
    [viewId, user.id]
  );
  return { starred: true };
}
