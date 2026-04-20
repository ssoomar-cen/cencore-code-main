import { Router, Request, Response } from "express";
import { db } from "../utils/prisma.js";

const router = Router();

// GET /api/contracts - List contracts with pagination + search
router.get("/", async (req: Request, res: Response) => {
  const { search = "", page = "1", limit = "250" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit) || 250, 500);
  const pageNum = Math.max(1, parseInt(page) || 1);
  const offset = (pageNum - 1) * lim;

  const params: any[] = [];
  let where = "";
  if (search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    where = `WHERE (LOWER(c.name) LIKE $1 OR LOWER(c.contract_status) LIKE $1 OR LOWER(a.name) LIKE $1)`;
  }

  try {
    const [countResult, rows] = await Promise.all([
      db.query<{ count: string }>(
        `SELECT COUNT(*) FROM contract c LEFT JOIN accounts a ON c.account_id = a.id ${where}`,
        params,
      ),
      db.query(
        `SELECT c.*,
                c.contract_start_date AS start_date,
                c.billing_schedule_end_date AS end_date,
                json_build_object('name', a.name) AS accounts
         FROM contract c
         LEFT JOIN accounts a ON c.account_id = a.id
         ${where}
         ORDER BY c.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, lim, offset],
      ),
    ]);
    return res.json({ data: rows, total: parseInt(countResult[0]?.count ?? "0"), page: pageNum, limit: lim });
  } catch (error) {
    console.error("Error fetching contracts:", error);
    return res.status(500).json({ error: "Failed to fetch contracts" });
  }
});

// GET /api/contracts/:id - Get single contract
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rows = await db.query(
      `SELECT c.*,
              c.contract_start_date AS start_date,
              c.billing_schedule_end_date AS end_date,
              json_build_object('name', a.name) AS accounts
       FROM contract c
       LEFT JOIN accounts a ON c.account_id = a.id
       WHERE c.contract_id = $1`,
      [id],
    );
    if (rows.length === 0) {
      res.status(404).json({ error: "Contract not found" });
      return;
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching contract:", error);
    res.status(500).json({ error: "Failed to fetch contract" });
  }
});

export const contractRouter = router;
