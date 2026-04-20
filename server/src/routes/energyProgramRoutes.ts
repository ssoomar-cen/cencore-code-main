import { Router, Request, Response } from "express";
import { db } from "../utils/prisma.js";
import { randomUUID } from "crypto";

const router = Router();

// GET /api/energy-programs - List energy programs with pagination + search
router.get("/", async (req: Request, res: Response) => {
  const { search = "", page = "1", limit = "250" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit) || 250, 500);
  const pageNum = Math.max(1, parseInt(page) || 1);
  const offset = (pageNum - 1) * lim;

  const params: any[] = [];
  let where = "";
  if (search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    where = `WHERE (LOWER(ep.name) LIKE $1 OR LOWER(ep.status) LIKE $1 OR LOWER(COALESCE(ep.service_status,'')) LIKE $1 OR LOWER(ep.pgm_id) LIKE $1 OR LOWER(a.name) LIKE $1)`;
  }

  try {
    const [countResult, rows] = await Promise.all([
      db.query<{ count: string }>(
        `SELECT COUNT(*) FROM energy_program ep LEFT JOIN accounts a ON ep.account_id = a.id ${where}`,
        params,
      ),
      db.query(
        `SELECT ep.*,
                ep.energy_program_id AS id,
                ep.contract_start_date AS start_date,
                ep.billing_schedule_end_date AS end_date,
                json_build_object('name', a.name) AS accounts
         FROM energy_program ep
         LEFT JOIN accounts a ON ep.account_id = a.id
         ${where}
         ORDER BY ep.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, lim, offset],
      ),
    ]);
    return res.json({ data: rows, total: parseInt(countResult[0]?.count ?? "0"), page: pageNum, limit: lim });
  } catch (error) {
    console.error("Error fetching energy programs:", error);
    return res.status(500).json({ error: "Failed to fetch energy programs" });
  }
});

// GET /api/energy-programs/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rows = await db.query(
      `SELECT ep.*,
              ep.energy_program_id AS id,
              ep.contract_start_date AS start_date,
              ep.billing_schedule_end_date AS end_date,
              json_build_object('name', a.name) AS accounts
       FROM energy_program ep
       LEFT JOIN accounts a ON ep.account_id = a.id
       WHERE ep.energy_program_id = $1`,
      [id],
    );
    if (rows.length === 0) {
      res.status(404).json({ error: "Energy program not found" });
      return;
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching energy program:", error);
    res.status(500).json({ error: "Failed to fetch energy program" });
  }
});

// POST /api/energy-programs
router.post("/", async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const record: Record<string, any> = {
      energy_program_id: randomUUID(),
      updated_at: new Date().toISOString(),
    };
    const writableCols = new Set([
      "name", "account_id", "status", "service_status",
      "pgm_id", "technical_lead", "implementation_consultant",
      "contract_start_date", "billing_schedule_end_date",
    ]);
    for (const [k, v] of Object.entries(body)) {
      if (writableCols.has(k)) record[k] = v === "" ? null : v;
    }
    const cols = Object.keys(record).join(", ");
    const placeholders = Object.keys(record).map((_, i) => `$${i + 1}`).join(", ");
    const rows = await db.query(
      `INSERT INTO energy_program (${cols}) VALUES (${placeholders})
       RETURNING *, energy_program_id AS id, contract_start_date AS start_date, billing_schedule_end_date AS end_date`,
      Object.values(record),
    );
    return res.status(201).json(rows[0]);
  } catch (error: any) {
    console.error("Error creating energy program:", error);
    return res.status(500).json({ error: error.message || "Failed to create energy program" });
  }
});

// DELETE /api/energy-programs/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await db.execute(`DELETE FROM energy_program WHERE energy_program_id = $1`, [req.params.id]);
    return res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting energy program:", error);
    return res.status(500).json({ error: error.message || "Failed to delete energy program" });
  }
});

const ALLOWED_EP_COLS = new Set([
  "name", "account_id", "status", "service_status",
  "pgm_id", "technical_lead", "implementation_consultant",
  "contract_start_date", "billing_schedule_end_date",
]);

// PUT /api/energy-programs/:id
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const [k, v] of Object.entries(body)) {
      if (ALLOWED_EP_COLS.has(k)) updates[k] = v === "" ? null : v;
    }
    const keys = Object.keys(updates);
    const setCols = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
    const rows = await db.query(
      `UPDATE energy_program SET ${setCols} WHERE energy_program_id = $1
       RETURNING *, energy_program_id AS id, contract_start_date AS start_date, billing_schedule_end_date AS end_date`,
      [id, ...keys.map(k => updates[k])],
    );
    if (!rows.length) return res.status(404).json({ error: "Energy program not found" });
    return res.json(rows[0]);
  } catch (error: any) {
    console.error("Error updating energy program:", error);
    return res.status(500).json({ error: error.message || "Failed to update energy program" });
  }
});

export const energyProgramRouter = router;
