import { Router, Request, Response } from "express";
import { db } from "../utils/prisma.js";

export const buildingRouter = Router();

buildingRouter.get("/", async (req: Request, res: Response) => {
  const { q, search, page = "1", limit = "250" } = req.query as Record<string, string>;
  const searchTerm = (search || q || "").trim();
  const lim = Math.min(parseInt(limit) || 250, 500);
  const pageNum = Math.max(1, parseInt(page) || 1);
  const offset = (pageNum - 1) * lim;

  try {
    const params: any[] = [];
    let where = "";
    if (searchTerm) {
      params.push(`%${searchTerm.toLowerCase()}%`);
      where = `WHERE (LOWER(b.name) LIKE $1 OR LOWER(b.address_city) LIKE $1 OR LOWER(b.address_state) LIKE $1 OR LOWER(b.primary_use) LIKE $1 OR LOWER(b.building_no) LIKE $1 OR LOWER(b.status) LIKE $1)`;
    }

    const countParams = [...params];
    const total = await db.query<{ count: string }>(
      `SELECT COUNT(*) FROM buildings b ${where}`, countParams,
    );

    params.push(lim, offset);
    const rows = await db.query(
      `SELECT b.id, b.name, b.salesforce_id,
              b.building_no, b.place_code, b.place_id,
              b.status, b.status_reason, b.primary_use AS building_type,
              b.address_street, b.address_2, b.address_city, b.address_state, b.address_zip,
              b.square_footage, b.exclude_from_greenx,
              b.building_d365_id, b.ecap_building_id, b.ecap_owner, b.measure_building_id,
              b.account_id, b.energy_program_id,
              b.tenant_id, b.created_at, b.updated_at,
              json_build_object('id', a.id, 'name', a.name) AS accounts,
              json_build_object('id', e.energy_program_id, 'name', e.name) AS energy_program
       FROM buildings b
       LEFT JOIN accounts a ON a.id = b.account_id
       LEFT JOIN energy_program e ON e.energy_program_id = b.energy_program_id
       ${where}
       ORDER BY b.name
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return res.json({ data: rows, total: parseInt(total[0]?.count ?? "0"), page: pageNum, limit: lim });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

buildingRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const rows = await db.query(
      `SELECT b.*, a.name AS account_name, e.name AS energy_program_name
       FROM buildings b
       LEFT JOIN accounts a ON a.id = b.account_id
       LEFT JOIN energy_program e ON e.energy_program_id = b.energy_program_id
       WHERE b.id = $1`,
      [req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: "Building not found" });
    return res.json(rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
