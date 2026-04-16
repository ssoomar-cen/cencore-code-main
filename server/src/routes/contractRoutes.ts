import { Router, Request, Response } from "express";
import { db } from "../utils/prisma.js";

const router = Router();

// GET /api/contracts - List all contracts with account name
router.get("/", async (_req: Request, res: Response) => {
  try {
    const contracts = await db.query(`
      SELECT c.*,
             c.contract_start_date AS start_date,
             c.billing_schedule_end_date AS end_date,
             json_build_object('name', a.name) AS accounts
      FROM contract c
      LEFT JOIN accounts a ON c.account_id = a.id
      ORDER BY c.created_at DESC
      LIMIT 500
    `);
    res.json(contracts);
  } catch (error) {
    console.error("Error fetching contracts:", error);
    res.status(500).json({ error: "Failed to fetch contracts" });
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
      [id]
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
