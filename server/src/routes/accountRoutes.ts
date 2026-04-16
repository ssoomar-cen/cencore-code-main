import { Router, Request, Response } from "express";
import { db } from "../utils/prisma.js";

const router = Router();

// GET /api/accounts - List all accounts
router.get("/", async (req: Request, res: Response) => {
  try {
    const accounts = await db.query(`
      SELECT a.id, a.name, a.salesforce_id, a.industry, a.region,
             (SELECT COUNT(*) FROM contract WHERE account_id = a.id) as contract_count,
             (SELECT COUNT(*) FROM energy_program WHERE account_id = a.id) as program_count,
             (SELECT COUNT(*) FROM invoice WHERE account_id = a.id) as invoice_count
      FROM accounts a
      ORDER BY a.name 
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
      SELECT id, name, salesforce_id, industry, region, 
             billing_city, billing_state, billing_country, billing_street,
             phone, website, status, contract_status, org_legal_name, org_type
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
      SELECT contract_id, name, salesforce_id, contract_status, contract_type, 
             contract_term, contract_start_date, billing_schedule_end_date, 
             client_manager, service_status
      FROM contract 
      WHERE account_id = $1 
      ORDER BY contract_start_date DESC
      LIMIT 100
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
      SELECT energy_program_id, name, salesforce_id, status, pgm_id, 
             technical_lead, implementation_consultant, 
             contract_start_date, billing_schedule_end_date
      FROM energy_program 
      WHERE account_id = $1 
      ORDER BY contract_start_date DESC
      LIMIT 100
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
      SELECT invoice_id, name, invoice_sf_number, invoice_total, due_date, 
             bill_month, intacct_status, status, document_type, 
             contract_id, energy_program_id
      FROM invoice 
      WHERE account_id = $1 
      ORDER BY bill_month DESC
      LIMIT 100
      `,
      [id]
    );
    res.json({ data: invoices });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

// GET /api/accounts/contracts/:contractId - Get contract details
router.get("/contracts/:contractId", async (req: Request, res: Response) => {
  try {
    const { contractId } = req.params;
    const contracts = await db.query(
      `
      SELECT contract_id, name, salesforce_id, account_id, contract_status, contract_type, 
             contract_term, contract_start_date, billing_schedule_end_date, 
             client_manager, service_status, created_at, updated_at
      FROM contract 
      WHERE contract_id = $1
      `,
      [contractId]
    );
    if (contracts.length === 0) {
      res.status(404).json({ error: "Contract not found" });
      return;
    }
    res.json({ data: contracts[0] });
  } catch (error) {
    console.error("Error fetching contract:", error);
    res.status(500).json({ error: "Failed to fetch contract" });
  }
});

// GET /api/accounts/contracts/:contractId/invoices - Get invoices for a contract
router.get("/contracts/:contractId/invoices", async (req: Request, res: Response) => {
  try {
    const { contractId } = req.params;
    const invoices = await db.query(
      `
      SELECT invoice_id, name, invoice_sf_number, invoice_total, due_date, 
             bill_month, intacct_status, status, document_type
      FROM invoice 
      WHERE contract_id = $1 
      ORDER BY bill_month DESC
      LIMIT 100
      `,
      [contractId]
    );
    res.json({ data: invoices });
  } catch (error) {
    console.error("Error fetching contract invoices:", error);
    res.status(500).json({ error: "Failed to fetch contract invoices" });
  }
});

// GET /api/accounts/programs/:programId - Get energy program details
router.get("/programs/:programId", async (req: Request, res: Response) => {
  try {
    const { programId } = req.params;
    const programs = await db.query(
      `
      SELECT energy_program_id, name, salesforce_id, account_id, status, pgm_id, 
             technical_lead, implementation_consultant, 
             contract_start_date, billing_schedule_end_date, created_at, updated_at
      FROM energy_program 
      WHERE energy_program_id = $1
      `,
      [programId]
    );
    if (programs.length === 0) {
      res.status(404).json({ error: "Energy program not found" });
      return;
    }
    res.json({ data: programs[0] });
  } catch (error) {
    console.error("Error fetching energy program:", error);
    res.status(500).json({ error: "Failed to fetch energy program" });
  }
});

// GET /api/accounts/programs/:programId/invoices - Get invoices for an energy program
router.get("/programs/:programId/invoices", async (req: Request, res: Response) => {
  try {
    const { programId } = req.params;
    const invoices = await db.query(
      `
      SELECT invoice_id, name, invoice_sf_number, invoice_total, due_date, 
             bill_month, intacct_status, status, document_type
      FROM invoice 
      WHERE energy_program_id = $1 
      ORDER BY bill_month DESC
      LIMIT 100
      `,
      [programId]
    );
    res.json({ data: invoices });
  } catch (error) {
    console.error("Error fetching program invoices:", error);
    res.status(500).json({ error: "Failed to fetch program invoices" });
  }
});

export default router;