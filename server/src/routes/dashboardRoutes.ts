import { Router, Request, Response } from "express";
import { db } from "../utils/prisma.js";

const router = Router();

router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const future180 = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const [
      contractRow,
      accountRow,
      oppRow,
      programRows,
      expiringRows,
      recentOpps,
    ] = await Promise.all([
      db.query<{ count: string }>("SELECT COUNT(*) FROM contract"),
      db.query<{ count: string }>("SELECT COUNT(*) FROM accounts"),
      db.query<{ count: string }>("SELECT COUNT(*) FROM opportunities"),
      db.query<{ status: string; count: string }>(
        "SELECT COALESCE(status, 'Unknown') AS status, COUNT(*) FROM energy_program GROUP BY status"
      ),
      db.query<{ end_date: string }>(
        `SELECT billing_schedule_end_date AS end_date FROM energy_program WHERE billing_schedule_end_date >= $1 AND billing_schedule_end_date <= $2`,
        [today, future180]
      ),
      db.query<{ id: string; name: string; stage: string; amount: string }>(
        `SELECT o.id, o.name, o.stage, o.amount
         FROM opportunities o
         ORDER BY o.created_at DESC LIMIT 10`
      ),
    ]);

    const totalPrograms = programRows.reduce((s, r) => s + parseInt(r.count), 0);
    const activePrograms = programRows
      .filter(r => r.status?.toLowerCase() === "active")
      .reduce((s, r) => s + parseInt(r.count), 0);
    const suspendedPrograms = programRows
      .filter(r => ["on hold", "suspended", "on_hold"].includes(r.status?.toLowerCase()))
      .reduce((s, r) => s + parseInt(r.count), 0);
    const terminatedPrograms = programRows
      .filter(r => ["terminated", "cancelled", "canceled"].includes(r.status?.toLowerCase()))
      .reduce((s, r) => s + parseInt(r.count), 0);
    const completedPrograms = programRows
      .filter(r => ["completed", "ooc", "complete"].includes(r.status?.toLowerCase()))
      .reduce((s, r) => s + parseInt(r.count), 0);

    return res.json({
      contractCount: parseInt(contractRow[0]?.count ?? "0"),
      accountCount: parseInt(accountRow[0]?.count ?? "0"),
      opportunityCount: parseInt(oppRow[0]?.count ?? "0"),
      programs: {
        total: totalPrograms,
        active: activePrograms,
        suspended: suspendedPrograms,
        terminated: terminatedPrograms,
        completed: completedPrograms,
      },
      expiringPrograms: expiringRows,
      recentOpportunities: recentOpps,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return res.status(500).json({ error: "Failed to load dashboard stats" });
  }
});

export const dashboardRouter = router;
