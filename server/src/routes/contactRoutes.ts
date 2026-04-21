import { Router, Request, Response } from "express";
import { db } from "../utils/prisma.js";

export const contactRouter = Router();

// GET /api/contacts - List contacts with pagination + search
contactRouter.get("/", async (req: Request, res: Response) => {
  const { search = "", page = "1", limit = "250" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit) || 250, 500);
  const pageNum = Math.max(1, parseInt(page) || 1);
  const offset = (pageNum - 1) * lim;

  const params: any[] = [];
  let where = "";
  if (search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    where = `WHERE (LOWER(c.first_name) LIKE $1 OR LOWER(c.last_name) LIKE $1 OR LOWER(c.email) LIKE $1 OR LOWER(c.phone) LIKE $1 OR LOWER(c.job_title) LIKE $1 OR LOWER(a.name) LIKE $1)`;
  }

  try {
    const [countResult, rows] = await Promise.all([
      db.query<{ count: string }>(
        `SELECT COUNT(*) FROM contacts c LEFT JOIN accounts a ON a.id = c.account_id ${where}`,
        params,
      ),
      db.query(
        `SELECT c.*,
                json_build_object('name', a.name) AS accounts
         FROM contacts c
         LEFT JOIN accounts a ON a.id = c.account_id
         ${where}
         ORDER BY c.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, lim, offset],
      ),
    ]);
    return res.json({ data: rows, total: parseInt(countResult[0]?.count ?? "0"), page: pageNum, limit: lim });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

// GET /api/contacts/:id - Get a single contact by id for deep-linked CRM detail views
contactRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const rows = await db.query(
      `SELECT c.*,
              json_build_object('id', a.id, 'name', a.name) AS accounts
       FROM contacts c
       LEFT JOIN accounts a ON a.id = c.account_id
       WHERE c.id = $1`,
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: "Contact not found" });
    return res.json({ data: rows[0] });
  } catch (error) {
    console.error("Error fetching contact:", error);
    return res.status(500).json({ error: "Failed to fetch contact" });
  }
});
