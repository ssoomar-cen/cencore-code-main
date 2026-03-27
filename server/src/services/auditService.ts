import { db } from "../utils/prisma.js";
import { AuthUser } from "../types/view.js";

export async function writeAuditLog(user: AuthUser, action: string, entity: string, entityId?: string, payload?: unknown) {
  try {
    await db.execute(
      `INSERT INTO audit_logs ("actorId", action, entity, "entityId", payload, "createdAt")
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [user.id, action, entity, entityId ?? null, payload ? JSON.stringify(payload) : null]
    );
  } catch {
    // audit failures must not break main flow
  }
}
