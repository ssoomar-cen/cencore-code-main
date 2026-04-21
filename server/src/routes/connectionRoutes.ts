import { Router, Request, Response } from "express";
import { db } from "../utils/prisma.js";
import { randomUUID } from "crypto";

export const connectionRouter = Router();

connectionRouter.get("/", async (req: Request, res: Response) => {
  const { search = "", page = "1", limit = "500" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit) || 500, 2000);
  const pageNum = Math.max(1, parseInt(page) || 1);
  const offset = (pageNum - 1) * lim;

  const params: any[] = [];
  let where = "";
  if (search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    where = `WHERE (LOWER(c1.first_name) LIKE $1 OR LOWER(c1.last_name) LIKE $1
              OR LOWER(c2.first_name) LIKE $1 OR LOWER(c2.last_name) LIKE $1
              OR LOWER(cn.relationship_type) LIKE $1)`;
  }

  try {
    const [countResult, rows] = await Promise.all([
      db.query<{ count: string }>(
        `SELECT COUNT(*) FROM connections cn
         LEFT JOIN contacts c1 ON c1.id = cn.contact_id
         LEFT JOIN contacts c2 ON c2.id = cn.connected_contact_id
         ${where}`,
        params,
      ),
      db.query(
        `SELECT cn.*,
                json_build_object('id', c1.id, 'first_name', c1.first_name, 'last_name', c1.last_name) AS contact,
                json_build_object('id', c2.id, 'first_name', c2.first_name, 'last_name', c2.last_name) AS connected_contact
         FROM connections cn
         LEFT JOIN contacts c1 ON c1.id = cn.contact_id
         LEFT JOIN contacts c2 ON c2.id = cn.connected_contact_id
         ${where}
         ORDER BY cn.created_at DESC
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
    console.error("Error fetching connections:", error);
    return res.status(500).json({ error: "Failed to fetch connections" });
  }
});

connectionRouter.post("/", async (req: Request, res: Response) => {
  const { contact_id, connected_contact_id, relationship_type, notes } = req.body;
  if (!contact_id || !connected_contact_id) {
    return res.status(400).json({ error: "contact_id and connected_contact_id are required" });
  }
  try {
    const rows = await db.query(
      `INSERT INTO connections (id, contact_id, connected_contact_id, relationship_type, notes, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [randomUUID(), contact_id, connected_contact_id, relationship_type || null, notes || null],
    );
    return res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Error creating connection:", error);
    return res.status(500).json({ error: "Failed to create connection" });
  }
});

connectionRouter.put("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { contact_id, connected_contact_id, relationship_type, notes } = req.body;
  try {
    const rows = await db.query(
      `UPDATE connections SET
         contact_id = COALESCE($2, contact_id),
         connected_contact_id = COALESCE($3, connected_contact_id),
         relationship_type = $4,
         notes = $5,
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, contact_id || null, connected_contact_id || null, relationship_type || null, notes || null],
    );
    if (!rows[0]) return res.status(404).json({ error: "Connection not found" });
    return res.json(rows[0]);
  } catch (error) {
    console.error("Error updating connection:", error);
    return res.status(500).json({ error: "Failed to update connection" });
  }
});

connectionRouter.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.execute(`DELETE FROM connections WHERE id = $1`, [id]);
    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting connection:", error);
    return res.status(500).json({ error: "Failed to delete connection" });
  }
});
