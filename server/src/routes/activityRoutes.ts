import { Router, Request, Response } from "express";
import { db } from "../utils/prisma.js";
import { randomUUID } from "crypto";

export const activityRouter = Router();

const ALLOWED_COLS = new Set([
  "subject", "description", "status", "priority", "due_date", "activity_type",
  "location", "duration_minutes", "all_day_event", "completed_datetime",
  "is_closed", "contact_method", "visit_type", "visit_length", "sales_meeting_type",
  "activity_number", "start_datetime", "end_datetime", "number_of_attendees",
  "account_id", "contact_id", "opportunity_id",
  "related_to_id", "related_to_type", "notes",
]);

const relatedToNameExpr = `
  CASE
    WHEN ac.related_to_type = 'account' THEN (SELECT name FROM accounts WHERE id = ac.related_to_id)
    WHEN ac.related_to_type = 'opportunity' THEN (SELECT name FROM opportunities WHERE id = ac.related_to_id)
    WHEN ac.related_to_type = 'energy_program' THEN (SELECT name FROM energy_program WHERE energy_program_id = ac.related_to_id)
    ELSE NULL
  END AS related_to_name`;

// GET /api/activities
activityRouter.get("/", async (req: Request, res: Response) => {
  const { search = "", page = "1", limit = "250" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit) || 250, 500);
  const pageNum = Math.max(1, parseInt(page) || 1);
  const offset = (pageNum - 1) * lim;

  const params: any[] = [];
  let where = "";
  if (search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    where = `WHERE (LOWER(ac.subject) LIKE $1 OR LOWER(ac.activity_type) LIKE $1 OR LOWER(ac.status) LIKE $1 OR LOWER(a.name) LIKE $1)`;
  }

  try {
    const [countResult, rows] = await Promise.all([
      db.query<{ count: string }>(
        `SELECT COUNT(*) FROM activities ac LEFT JOIN accounts a ON a.id = ac.account_id ${where}`,
        params,
      ),
      db.query(
        `SELECT ac.*,
                json_build_object('name', a.name) AS accounts,
                json_build_object('first_name', ct.first_name, 'last_name', ct.last_name) AS contacts,
                ${relatedToNameExpr}
         FROM activities ac
         LEFT JOIN accounts a ON a.id = ac.account_id
         LEFT JOIN contacts ct ON ct.id = ac.contact_id
         ${where}
         ORDER BY ac.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, lim, offset],
      ),
    ]);
    return res.json({ data: rows, total: parseInt(countResult[0]?.count ?? "0"), page: pageNum, limit: lim });
  } catch (error) {
    console.error("Error fetching activities:", error);
    return res.status(500).json({ error: "Failed to fetch activities" });
  }
});

// GET /api/activities/:id
activityRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const rows = await db.query(
      `SELECT ac.*,
              json_build_object('name', a.name) AS accounts,
              json_build_object('first_name', ct.first_name, 'last_name', ct.last_name) AS contacts,
              ${relatedToNameExpr}
       FROM activities ac
       LEFT JOIN accounts a ON a.id = ac.account_id
       LEFT JOIN contacts ct ON ct.id = ac.contact_id
       WHERE ac.id = $1`,
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: "Activity not found" });
    return res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching activity:", error);
    return res.status(500).json({ error: "Failed to fetch activity" });
  }
});

// POST /api/activities
activityRouter.post("/", async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const record: Record<string, any> = { id: randomUUID(), updated_at: new Date().toISOString() };
    for (const [k, v] of Object.entries(body)) {
      if (ALLOWED_COLS.has(k)) record[k] = v === "" ? null : v;
    }
    const cols = Object.keys(record).join(", ");
    const placeholders = Object.keys(record).map((_, i) => `$${i + 1}`).join(", ");
    const rows = await db.query(
      `INSERT INTO activities (${cols}) VALUES (${placeholders}) RETURNING *`,
      Object.values(record),
    );
    return res.status(201).json(rows[0]);
  } catch (error: any) {
    console.error("Error creating activity:", error);
    return res.status(500).json({ error: error.message || "Failed to create activity" });
  }
});

// PUT /api/activities/:id
activityRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const [k, v] of Object.entries(body)) {
      if (ALLOWED_COLS.has(k)) updates[k] = v === "" ? null : v;
    }
    const keys = Object.keys(updates);
    if (!keys.length) return res.json({ id: req.params.id });
    const setCols = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
    const rows = await db.query(
      `UPDATE activities SET ${setCols} WHERE id = $1 RETURNING *`,
      [req.params.id, ...keys.map(k => updates[k])],
    );
    if (!rows.length) return res.status(404).json({ error: "Activity not found" });
    return res.json(rows[0]);
  } catch (error: any) {
    console.error("Error updating activity:", error);
    return res.status(500).json({ error: error.message || "Failed to update activity" });
  }
});

// DELETE /api/activities/:id
activityRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    await db.execute(`DELETE FROM activities WHERE id = $1`, [req.params.id]);
    return res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting activity:", error);
    return res.status(500).json({ error: error.message || "Failed to delete activity" });
  }
});
