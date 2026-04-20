import { Router, Request, Response } from "express";
import { db } from "../utils/prisma.js";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  const { search = "", page = "1", limit = "250" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit) || 250, 500);
  const pageNum = Math.max(1, parseInt(page) || 1);
  const offset = (pageNum - 1) * lim;

  const params: any[] = [];
  let where = "";
  if (search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    where = `WHERE (LOWER(o.name) LIKE $1 OR LOWER(o.stage) LIKE $1 OR LOWER(a.name) LIKE $1)`;
  }

  try {
    const [countResult, rows] = await Promise.all([
      db.query<{ count: string }>(
        `SELECT COUNT(*) FROM opportunities o LEFT JOIN accounts a ON o.account_id = a.id ${where}`,
        params,
      ),
      db.query(
        `SELECT o.*,
                json_build_object('name', a.name) AS accounts
         FROM opportunities o
         LEFT JOIN accounts a ON o.account_id = a.id
         ${where}
         ORDER BY o.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, lim, offset],
      ),
    ]);
    return res.json({ data: rows, total: parseInt(countResult[0]?.count ?? "0"), page: pageNum, limit: lim });
  } catch (error) {
    console.error("Error fetching opportunities:", error);
    return res.status(500).json({ error: "Failed to fetch opportunities" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const rows = await db.query(
      `SELECT o.*, json_build_object('name', a.name) AS accounts
       FROM opportunities o
       LEFT JOIN accounts a ON o.account_id = a.id
       WHERE o.id = $1`,
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: "Opportunity not found" });
    return res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching opportunity:", error);
    return res.status(500).json({ error: "Failed to fetch opportunity" });
  }
});

export const opportunityRouter = router;
