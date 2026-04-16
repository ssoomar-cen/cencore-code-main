import { Router, Request, Response } from "express";
import { db } from "../utils/prisma.js";

const router = Router();

// GET /api/energy-programs - List all energy programs with account name
router.get("/", async (_req: Request, res: Response) => {
  try {
    const programs = await db.query(`
      SELECT ep.*,
             ep.contract_start_date AS start_date,
             ep.billing_schedule_end_date AS end_date,
             json_build_object('name', a.name) AS accounts
      FROM energy_program ep
      LEFT JOIN accounts a ON ep.account_id = a.id
      ORDER BY ep.created_at DESC
      LIMIT 500
    `);
    res.json(programs);
  } catch (error) {
    console.error("Error fetching energy programs:", error);
    res.status(500).json({ error: "Failed to fetch energy programs" });
  }
});

// GET /api/energy-programs/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rows = await db.query(
      `SELECT ep.*,
              ep.contract_start_date AS start_date,
              ep.billing_schedule_end_date AS end_date,
              json_build_object('name', a.name) AS accounts
       FROM energy_program ep
       LEFT JOIN accounts a ON ep.account_id = a.id
       WHERE ep.energy_program_id = $1`,
      [id]
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

export const energyProgramRouter = router;
