import { Router, Request, Response } from "express";
import { db } from "../utils/prisma.js";
import { randomUUID } from "crypto";

export const quoteRouter = Router();

quoteRouter.get("/", async (req: Request, res: Response) => {
  const { search = "", page = "1", limit = "500" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit) || 500, 2000);
  const pageNum = Math.max(1, parseInt(page) || 1);
  const offset = (pageNum - 1) * lim;

  const params: any[] = [];
  let where = "";
  if (search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    where = `WHERE (LOWER(q.name) LIKE $1 OR LOWER(q.quote_number) LIKE $1 OR LOWER(q.status) LIKE $1)`;
  }

  try {
    const [countResult, rows] = await Promise.all([
      db.query<{ count: string }>(
        `SELECT COUNT(*) FROM quotes q ${where}`,
        params,
      ),
      db.query(
        `SELECT q.*,
                json_build_object('id', a.id, 'name', a.name) AS accounts,
                json_build_object('id', o.id, 'name', o.name) AS opportunities
         FROM quotes q
         LEFT JOIN accounts a ON a.id = q.account_id
         LEFT JOIN opportunities o ON o.id = q.opportunity_id
         ${where}
         ORDER BY q.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, lim, offset],
      ),
    ]);
    return res.json({
      data: rows,
      total: parseInt(countResult[0]?.count ?? "0"),
      page: pageNum,
      limit: lim,
    });
  } catch (error) {
    console.error("Error fetching quotes:", error);
    return res.status(500).json({ error: "Failed to fetch quotes" });
  }
});

quoteRouter.post("/", async (req: Request, res: Response) => {
  const { name, quote_number, account_id, opportunity_id, status, subtotal, discount, tax, total, valid_until, terms, notes } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  try {
    const rows = await db.query(
      `INSERT INTO quotes (id, name, quote_number, account_id, opportunity_id, status, subtotal, discount, tax, total, valid_until, terms, notes, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
       RETURNING *`,
      [randomUUID(), name, quote_number || null, account_id || null, opportunity_id || null,
       status || "draft", subtotal || null, discount || null, tax || null, total || null,
       valid_until || null, terms || null, notes || null],
    );
    return res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Error creating quote:", error);
    return res.status(500).json({ error: "Failed to create quote" });
  }
});

quoteRouter.put("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, quote_number, account_id, opportunity_id, status, subtotal, discount, tax, total, valid_until, terms, notes } = req.body;
  try {
    const rows = await db.query(
      `UPDATE quotes SET
         name = COALESCE($2, name),
         quote_number = $3,
         account_id = $4,
         opportunity_id = $5,
         status = COALESCE($6, status),
         subtotal = $7,
         discount = $8,
         tax = $9,
         total = $10,
         valid_until = $11,
         terms = $12,
         notes = $13,
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, name || null, quote_number || null, account_id || null, opportunity_id || null,
       status || null, subtotal || null, discount || null, tax || null, total || null,
       valid_until || null, terms || null, notes || null],
    );
    if (!rows[0]) return res.status(404).json({ error: "Quote not found" });
    return res.json(rows[0]);
  } catch (error) {
    console.error("Error updating quote:", error);
    return res.status(500).json({ error: "Failed to update quote" });
  }
});

quoteRouter.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.execute(`DELETE FROM quotes WHERE id = $1`, [id]);
    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting quote:", error);
    return res.status(500).json({ error: "Failed to delete quote" });
  }
});
