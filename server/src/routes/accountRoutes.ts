import { Router, Request, Response } from "express";
import { db } from "../utils/prisma.js";

const router = Router();

// GET /api/accounts - List all accounts
router.get("/", async (req: Request, res: Response) => {
  try {
    const accounts = await db.query(`
      SELECT id, "accountName", "accountNumber", "industry" 
      FROM accounts 
      ORDER BY "accountName" 
      LIMIT 100
    `);
    res.json({ data: accounts });
  } catch (error) {
    console.error("Error fetching accounts:", error);
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});

// GET /api/accounts/:id - Get account details
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const accounts = await db.query(
      `
      SELECT id, "accountName", "accountNumber", "industry", "accountType", "billingCity", "billingState" 
      FROM accounts 
      WHERE id = $1
      `,
      [id]
    );
    if (accounts.length === 0) {
      res.status(404).json({ error: "Account not found" });
      return;
    }
    res.json({ data: accounts[0] });
  } catch (error) {
    console.error("Error fetching account:", error);
    res.status(500).json({ error: "Failed to fetch account" });
  }
});

// GET /api/accounts/:id/contracts - Get contracts for account
router.get("/:id/contracts", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const contracts = await db.query(
      `
      SELECT id, "contractName", "contractNumber", "contractAmount", "startDate", "endDate", "status"
      FROM contracts 
      WHERE "accountId" = $1 
      ORDER BY "startDate" DESC
      `,
      [id]
    );
    res.json({ data: contracts });
  } catch (error) {
    console.error("Error fetching contracts:", error);
    res.status(500).json({ error: "Failed to fetch contracts" });
  }
});

// GET /api/accounts/:id/energy-programs - Get energy programs for account
router.get("/:id/energy-programs", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const programs = await db.query(
      `
      SELECT id, "programName", "programType", "startDate", "endDate", "savings"
      FROM energy_programs 
      WHERE "accountId" = $1 
      ORDER BY "startDate" DESC
      `,
      [id]
    );
    res.json({ data: programs });
  } catch (error) {
    console.error("Error fetching energy programs:", error);
    res.status(500).json({ error: "Failed to fetch energy programs" });
  }
});

// GET /api/accounts/:id/invoices - Get invoices for account
router.get("/:id/invoices", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invoices = await db.query(
      `
      SELECT id, "invoiceNumber", "invoiceAmount", "invoiceDate", "dueDate", "status"
      FROM invoices 
      WHERE "accountId" = $1 
      ORDER BY "invoiceDate" DESC
      `,
      [id]
    );
    res.json({ data: invoices });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

export default router;