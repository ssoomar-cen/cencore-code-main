import { Router, Request, Response } from "express";
import { db } from "../utils/prisma.js";

export const integrationRouter = Router();

integrationRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const rows = await db.query(
      `SELECT * FROM integrations ORDER BY category, name`,
    );
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

integrationRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const rows = await db.query(
      `SELECT * FROM integrations WHERE id = $1`,
      [req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: "Integration not found" });
    return res.json(rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

integrationRouter.patch("/:id", async (req: Request, res: Response) => {
  const { config, is_configured, is_enabled } = req.body as {
    config?: Record<string, any>;
    is_configured?: boolean;
    is_enabled?: boolean;
  };

  const sets: string[] = ["updated_at = NOW()"];
  const vals: any[] = [];
  let idx = 1;

  if (config !== undefined) { sets.push(`config = $${idx++}::jsonb`); vals.push(JSON.stringify(config)); }
  if (is_configured !== undefined) { sets.push(`is_configured = $${idx++}`); vals.push(is_configured); }
  if (is_enabled !== undefined) { sets.push(`is_enabled = $${idx++}`); vals.push(is_enabled); }

  vals.push(req.params.id);

  try {
    await db.execute(
      `UPDATE integrations SET ${sets.join(", ")} WHERE id = $${idx}`,
      vals,
    );
    const rows = await db.query(`SELECT * FROM integrations WHERE id = $1`, [req.params.id]);
    return res.json(rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── Sync schedules ───────────────────────────────────────────────────────────

integrationRouter.get("/:id/schedule", async (req: Request, res: Response) => {
  const { tenant_id } = req.query as { tenant_id?: string };
  if (!tenant_id) return res.status(400).json({ error: "tenant_id required" });
  try {
    const rows = await db.query(
      `SELECT * FROM sync_schedules WHERE integration_id = $1 AND tenant_id = $2`,
      [req.params.id, tenant_id],
    );
    return res.json(rows[0] ?? null);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

integrationRouter.put("/:id/schedule", async (req: Request, res: Response) => {
  const { tenant_id, is_active, interval_minutes, sync_objects, sync_direction, next_sync_at } = req.body as {
    tenant_id: string;
    is_active: boolean;
    interval_minutes: number;
    sync_objects: string[];
    sync_direction: string;
    next_sync_at: string | null;
  };
  if (!tenant_id) return res.status(400).json({ error: "tenant_id required" });
  try {
    await db.execute(
      `INSERT INTO sync_schedules (integration_id, tenant_id, is_active, interval_minutes, sync_objects, sync_direction, next_sync_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (integration_id, tenant_id) DO UPDATE SET
         is_active = EXCLUDED.is_active,
         interval_minutes = EXCLUDED.interval_minutes,
         sync_objects = EXCLUDED.sync_objects,
         sync_direction = EXCLUDED.sync_direction,
         next_sync_at = EXCLUDED.next_sync_at,
         updated_at = NOW()`,
      [req.params.id, tenant_id, is_active, interval_minutes, sync_objects, sync_direction, next_sync_at],
    );
    const rows = await db.query(
      `SELECT * FROM sync_schedules WHERE integration_id = $1 AND tenant_id = $2`,
      [req.params.id, tenant_id],
    );
    return res.json(rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

integrationRouter.delete("/:id/schedule", async (req: Request, res: Response) => {
  const { tenant_id } = req.query as { tenant_id?: string };
  if (!tenant_id) return res.status(400).json({ error: "tenant_id required" });
  try {
    await db.execute(
      `DELETE FROM sync_schedules WHERE integration_id = $1 AND tenant_id = $2`,
      [req.params.id, tenant_id],
    );
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
