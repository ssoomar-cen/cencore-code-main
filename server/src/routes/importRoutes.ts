import { Router, Request, Response } from "express";
import { pool } from "../utils/prisma.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import * as csv from "csv-parse/sync";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../../../data");

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function parseDate(value?: string): string | null {
  if (!value || value.trim() === "") return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function parseDecimal(value?: string): number | null {
  if (!value || value.trim() === "") return null;
  const n = parseFloat(value);
  return isNaN(n) ? null : n;
}

// POST /api/import/contracts
router.post("/contracts", async (_req: Request, res: Response) => {
  const filePath = path.join(DATA_DIR, "Contract_CEN__c.csv");
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: `File not found: ${filePath}` });
    return;
  }

  interface RawContract {
    Id: string;
    Name: string;
    "Organization_Name__c"?: string;
    "Contract_Status__c"?: string;
    "Contract_Type__c"?: string;
    "Contract_Term__c"?: string;
    "Contract_Start_Date__c"?: string;
    "Billing_Schedule_End_Date__c"?: string;
    "Client_Manager__c"?: string;
    "Service_Status__c"?: string;
  }

  const records = csv.parse(fs.readFileSync(filePath, "utf-8"), {
    columns: true,
    skip_empty_lines: true,
  }) as RawContract[];

  const client = await pool.connect();
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    for (const row of records) {
      if (!row.Name?.trim()) { skipped++; continue; }

      let accountId: string | null = null;
      if (row["Organization_Name__c"]) {
        const r = await client.query(
          `SELECT id FROM accounts WHERE salesforce_id = $1 LIMIT 1`,
          [row["Organization_Name__c"]]
        );
        accountId = r.rows[0]?.id ?? null;
      }
      if (!accountId) { skipped++; continue; }

      try {
        await client.query(
          `INSERT INTO contract (
            contract_id, name, account_id, salesforce_id,
            contract_status, contract_type, contract_term,
            contract_start_date, billing_schedule_end_date,
            client_manager, service_status, created_at, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
          ON CONFLICT (salesforce_id) DO UPDATE SET
            name=$2, account_id=$3,
            contract_status=$5, contract_type=$6, contract_term=$7,
            contract_start_date=$8, billing_schedule_end_date=$9,
            client_manager=$10, service_status=$11, updated_at=NOW()`,
          [
            generateUUID(), row.Name.trim(), accountId, row.Id,
            row["Contract_Status__c"]?.trim() || null,
            row["Contract_Type__c"]?.trim() || null,
            row["Contract_Term__c"]?.trim() || null,
            parseDate(row["Contract_Start_Date__c"]),
            parseDate(row["Billing_Schedule_End_Date__c"]),
            row["Client_Manager__c"]?.trim() || null,
            row["Service_Status__c"]?.trim() || null,
          ]
        );
        imported++;
      } catch (err) {
        skipped++;
        errors.push(`"${row.Name}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } finally {
    client.release();
  }

  res.json({ imported, skipped, errors: errors.slice(0, 20) });
});

// POST /api/import/energy-programs
router.post("/energy-programs", async (_req: Request, res: Response) => {
  const filePath = path.join(DATA_DIR, "Energy_Program__c.csv");
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: `File not found: ${filePath}` });
    return;
  }

  interface RawEnergyProgram {
    Id: string;
    Name: string;
    "Organization__c"?: string;
    "Status__c"?: string;
    "pgmId__c"?: string;
    "Technical_Lead__c"?: string;
    "Implementation_Consultant__c"?: string;
    "Contract_Start_Date__c"?: string;
    "Billing_Schedule_End_Date__c"?: string;
  }

  const records = csv.parse(fs.readFileSync(filePath, "utf-8"), {
    columns: true,
    skip_empty_lines: true,
  }) as RawEnergyProgram[];

  const client = await pool.connect();
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    for (const row of records) {
      if (!row.Name?.trim()) { skipped++; continue; }

      let accountId: string | null = null;
      if (row["Organization__c"]) {
        const r = await client.query(
          `SELECT id FROM accounts WHERE salesforce_id = $1 LIMIT 1`,
          [row["Organization__c"]]
        );
        accountId = r.rows[0]?.id ?? null;
      }
      if (!accountId) { skipped++; continue; }

      try {
        await client.query(
          `INSERT INTO energy_program (
            energy_program_id, name, account_id, salesforce_id,
            status, pgm_id, technical_lead, implementation_consultant,
            contract_start_date, billing_schedule_end_date, created_at, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
          ON CONFLICT (salesforce_id) DO UPDATE SET
            name=$2, account_id=$3,
            status=$5, pgm_id=$6, technical_lead=$7,
            implementation_consultant=$8,
            contract_start_date=$9, billing_schedule_end_date=$10,
            updated_at=NOW()`,
          [
            generateUUID(), row.Name.trim(), accountId, row.Id,
            row["Status__c"]?.trim() || null,
            row["pgmId__c"]?.trim() || null,
            row["Technical_Lead__c"]?.trim() || null,
            row["Implementation_Consultant__c"]?.trim() || null,
            parseDate(row["Contract_Start_Date__c"]),
            parseDate(row["Billing_Schedule_End_Date__c"]),
          ]
        );
        imported++;
      } catch (err) {
        skipped++;
        errors.push(`"${row.Name}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } finally {
    client.release();
  }

  res.json({ imported, skipped, errors: errors.slice(0, 20) });
});

// POST /api/import/invoices
router.post("/invoices", async (req: Request, res: Response) => {
  const filePath = path.join(DATA_DIR, "Invoice_CEN__c.csv");
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: `File not found: ${filePath}` });
    return;
  }

  const tenantId = (req as any).user?.tenantId || process.env.DEFAULT_TENANT_ID || "default";

  interface RawInvoice {
    Id: string;
    Name?: string;
    "Invoice_ID__c"?: string;
    "Contract__c"?: string;
    "Energy_Program__c"?: string;
    "Due_Date__c"?: string;
    "Scheduled_Date__c"?: string;
    "Cycle_End_Date__c"?: string;
    "Date_Delivered__c"?: string;
    "Ready_For_Billing__c"?: string;
    "Run_Reconciliation__c"?: string;
    "Intacct_State__c"?: string;
    "Intacct_Status__c"?: string;
    "Post_Date__c"?: string;
    "Invoice_Total__c"?: string;
    "Credit_Total__c"?: string;
    "Document_Type__c"?: string;
    "Applied_Payment_Date__c"?: string;
    "D365Contractid__c"?: string;
    "D365EnergyProgramid__c"?: string;
    "Legacy_Source__c"?: string;
    "Invoice_Total_Rollup__c"?: string;
    "Customerid__c"?: string;
    "Invoice_Name__c"?: string;
    "Bill_Month__c"?: string;
    "Contract_Amount__c"?: string;
    "Applied_Amount__c"?: string;
    "Generated_External_ID__c"?: string;
    "Invoice_Name_TK__c"?: string;
  }

  const records = csv.parse(fs.readFileSync(filePath, "utf-8"), {
    columns: true,
    skip_empty_lines: true,
  }) as RawInvoice[];

  const client = await pool.connect();
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    for (const row of records) {
      if (!row.Name?.trim()) { skipped++; continue; }

      let contractId: string | null = null;
      if (row["Contract__c"]) {
        const r = await client.query(
          `SELECT contract_id FROM contract WHERE salesforce_id = $1 LIMIT 1`,
          [row["Contract__c"]]
        );
        contractId = r.rows[0]?.contract_id ?? null;
      }

      let energyProgramId: string | null = null;
      if (row["Energy_Program__c"]) {
        const r = await client.query(
          `SELECT energy_program_id FROM energy_program WHERE salesforce_id = $1 LIMIT 1`,
          [row["Energy_Program__c"]]
        );
        energyProgramId = r.rows[0]?.energy_program_id ?? null;
      }

      let accountId: string | null = null;
      if (contractId) {
        const r = await client.query(
          `SELECT account_id FROM contract WHERE contract_id = $1 LIMIT 1`,
          [contractId]
        );
        accountId = r.rows[0]?.account_id ?? null;
      } else if (energyProgramId) {
        const r = await client.query(
          `SELECT account_id FROM energy_program WHERE energy_program_id = $1 LIMIT 1`,
          [energyProgramId]
        );
        accountId = r.rows[0]?.account_id ?? null;
      }

      try {
        await client.query(
          `INSERT INTO invoice (
            invoice_id, tenant_id, account_id, contract_id, energy_program_id,
            name, invoice_name, invoice_name_tk, invoice_sf_number,
            document_type, due_date, bill_month, post_date, scheduled_date,
            cycle_end_date, date_delivered, applied_payment_date,
            invoice_total, credit_total, contract_amount, applied_amount,
            intacct_state, intacct_status, ready_for_billing, run_reconciliation,
            generated_external_id, salesforce_id, d365_contract_id, d365_energy_program_id,
            legacy_source, customer_id, created_at, updated_at
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
            $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
            $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,
            $31,NOW(),NOW()
          )
          ON CONFLICT (salesforce_id) DO UPDATE SET
            name=$6, invoice_name=$7, invoice_name_tk=$8,
            document_type=$10, due_date=$11, bill_month=$12,
            post_date=$13, scheduled_date=$14, cycle_end_date=$15,
            date_delivered=$16, applied_payment_date=$17,
            invoice_total=$18, credit_total=$19, contract_amount=$20,
            applied_amount=$21, intacct_state=$22, intacct_status=$23,
            ready_for_billing=$24, run_reconciliation=$25,
            generated_external_id=$26, d365_contract_id=$28,
            d365_energy_program_id=$29, legacy_source=$30, customer_id=$31,
            updated_at=NOW()`,
          [
            generateUUID(), tenantId, accountId, contractId, energyProgramId,
            row.Name.trim(),
            row["Invoice_Name__c"]?.trim() || null,
            row["Invoice_Name_TK__c"]?.trim() || null,
            row["Invoice_ID__c"]?.trim() || null,
            row["Document_Type__c"]?.trim() || null,
            parseDate(row["Due_Date__c"]),
            parseDate(row["Bill_Month__c"]),
            parseDate(row["Post_Date__c"]),
            parseDate(row["Scheduled_Date__c"]),
            parseDate(row["Cycle_End_Date__c"]),
            parseDate(row["Date_Delivered__c"]),
            parseDate(row["Applied_Payment_Date__c"]),
            parseDecimal(row["Invoice_Total__c"]),
            parseDecimal(row["Credit_Total__c"]),
            parseDecimal(row["Contract_Amount__c"]),
            parseDecimal(row["Applied_Amount__c"]),
            row["Intacct_State__c"]?.trim() || null,
            row["Intacct_Status__c"]?.trim() || null,
            row["Ready_For_Billing__c"]?.trim() || null,
            row["Run_Reconciliation__c"]?.trim() || null,
            row["Generated_External_ID__c"]?.trim() || null,
            row.Id,
            row["D365Contractid__c"]?.trim() || null,
            row["D365EnergyProgramid__c"]?.trim() || null,
            row["Legacy_Source__c"]?.trim() || null,
            row["Customerid__c"]?.trim() || null,
          ]
        );
        imported++;
      } catch (err) {
        skipped++;
        errors.push(`"${row.Name}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } finally {
    client.release();
  }

  res.json({ imported, skipped, errors: errors.slice(0, 20) });
});

// POST /api/import/invoice-items
router.post("/invoice-items", async (req: Request, res: Response) => {
  const filePath = path.join(DATA_DIR, "Invoice_Item_CEN__c.csv");
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: `File not found: ${filePath}` });
    return;
  }

  const tenantId = (req as any).user?.tenantId || process.env.DEFAULT_TENANT_ID || "default";

  interface RawInvoiceItem {
    Id: string;
    Name?: string;
    "Invoice__c"?: string;
    "Energy_Program__c"?: string;
    "Invoice_Item_Type__c"?: string;
    "Period_Date__c"?: string;
    "Savings__c"?: string;
    "Current_Cost_Avoidance__c"?: string;
    "Previous_Cost_Avoidance__c"?: string;
    "Special_Savings__c"?: string;
    "Previous_Special_Savings__c"?: string;
    "Current_Less_Previous__c"?: string;
    "Credit__c"?: string;
    "Fee_Amount__c"?: string;
    "D365InvoiceItemGuid__c"?: string;
  }

  const records = csv.parse(fs.readFileSync(filePath, "utf-8"), {
    columns: true,
    skip_empty_lines: true,
  }) as RawInvoiceItem[];

  const client = await pool.connect();
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    for (const row of records) {
      let invoiceId: string | null = null;
      if (row["Invoice__c"]) {
        const r = await client.query(
          `SELECT invoice_id FROM invoice WHERE salesforce_id = $1 LIMIT 1`,
          [row["Invoice__c"]]
        );
        invoiceId = r.rows[0]?.invoice_id ?? null;
      }
      if (!invoiceId) { skipped++; continue; }

      let energyProgramId: string | null = null;
      if (row["Energy_Program__c"]) {
        const r = await client.query(
          `SELECT energy_program_id FROM energy_program WHERE salesforce_id = $1 LIMIT 1`,
          [row["Energy_Program__c"]]
        );
        energyProgramId = r.rows[0]?.energy_program_id ?? null;
      }

      try {
        await client.query(
          `INSERT INTO invoice_item (
            invoice_item_id, tenant_id, invoice_id, energy_program_id,
            name, invoice_item_type, period_date,
            savings, current_cost_avoidance, previous_cost_avoidance,
            special_savings, previous_special_savings, current_less_previous,
            credit, fee_amount, d365_invoice_item_guid, salesforce_id,
            created_at, updated_at
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
            $11,$12,$13,$14,$15,$16,$17,NOW(),NOW()
          )
          ON CONFLICT (d365_invoice_item_guid) DO UPDATE SET
            name=$5, invoice_item_type=$6, period_date=$7,
            savings=$8, current_cost_avoidance=$9, previous_cost_avoidance=$10,
            special_savings=$11, previous_special_savings=$12, current_less_previous=$13,
            credit=$14, fee_amount=$15, updated_at=NOW()
          WHERE invoice_item.d365_invoice_item_guid = $16`,
          [
            generateUUID(), tenantId, invoiceId, energyProgramId,
            row.Name?.trim() || null,
            row["Invoice_Item_Type__c"]?.trim() || null,
            parseDate(row["Period_Date__c"]),
            parseDecimal(row["Savings__c"]),
            parseDecimal(row["Current_Cost_Avoidance__c"]),
            parseDecimal(row["Previous_Cost_Avoidance__c"]),
            parseDecimal(row["Special_Savings__c"]),
            parseDecimal(row["Previous_Special_Savings__c"]),
            parseDecimal(row["Current_Less_Previous__c"]),
            parseDecimal(row["Credit__c"]),
            parseDecimal(row["Fee_Amount__c"]),
            row["D365InvoiceItemGuid__c"]?.trim() || null,
            row.Id,
          ]
        );
        imported++;
      } catch (err) {
        skipped++;
        errors.push(`"${row.Name}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } finally {
    client.release();
  }

  res.json({ imported, skipped, errors: errors.slice(0, 20) });
});

// POST /api/import/recon
router.post("/recon", async (req: Request, res: Response) => {
  const filePath = path.join(DATA_DIR, "recon(in).csv");
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: `File not found: ${filePath}` });
    return;
  }

  const tenantId = (req as any).user?.tenantId || process.env.DEFAULT_TENANT_ID || "default";

  interface RawRecon {
    Orgname?: string;
    placeInfo?: string;
    logicaldevicecode?: string;
    ReportDate?: string;
    Category?: string;
    "Current BATCC"?: string;
    "Previous BATCC"?: string;
    "Current Actual Cost"?: string;
    "Previous Actual Cost"?: string;
    "Current CA"?: string;
    "Previous CA"?: string;
    BeginDate?: string;
    EnergyProgram?: string;
    SalesDocName?: string;
    PlaceId?: string;
    invoiceitemid?: string;
    invoiceitemname?: string;
  }

  const records = csv.parse(fs.readFileSync(filePath, "utf-8"), {
    columns: true,
    skip_empty_lines: true,
  }) as RawRecon[];

  const client = await pool.connect();
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    for (const row of records) {
      let invoiceItemId: string | null = null;
      if (row.invoiceitemid) {
        const r = await client.query(
          `SELECT invoice_item_id FROM invoice_item WHERE salesforce_id = $1 LIMIT 1`,
          [row.invoiceitemid]
        );
        invoiceItemId = r.rows[0]?.invoice_item_id ?? null;
      }
      if (!invoiceItemId) { skipped++; continue; }

      let energyProgramId: string | null = null;
      if (row.EnergyProgram) {
        const r = await client.query(
          `SELECT energy_program_id FROM energy_program WHERE salesforce_id = $1 LIMIT 1`,
          [row.EnergyProgram]
        );
        energyProgramId = r.rows[0]?.energy_program_id ?? null;
      }

      let invoiceId: string | null = null;
      const invR = await client.query(
        `SELECT invoice_id FROM invoice_item WHERE invoice_item_id = $1 LIMIT 1`,
        [invoiceItemId]
      );
      invoiceId = invR.rows[0]?.invoice_id ?? null;

      try {
        await client.query(
          `INSERT INTO invoice_recon (
            invoice_recon_id, tenant_id, invoice_item_id, invoice_id,
            org_name, place_info, logical_device_code, report_date, begin_date,
            category, current_batcc, previous_batcc, current_actual_cost,
            previous_actual_cost, current_ca, previous_ca, energy_program_id,
            sales_doc_name, place_id, invoice_item_name, salesforce_id,
            created_at, updated_at
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
            $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,NOW(),NOW()
          )`,
          [
            generateUUID(), tenantId, invoiceItemId, invoiceId,
            row.Orgname?.trim() || null,
            row.placeInfo?.trim() || null,
            row.logicaldevicecode?.trim() || null,
            parseDate(row.ReportDate),
            parseDate(row.BeginDate),
            row.Category?.trim() || null,
            parseDecimal(row["Current BATCC"]),
            parseDecimal(row["Previous BATCC"]),
            parseDecimal(row["Current Actual Cost"]),
            parseDecimal(row["Previous Actual Cost"]),
            parseDecimal(row["Current CA"]),
            parseDecimal(row["Previous CA"]),
            energyProgramId,
            row.SalesDocName?.trim() || null,
            row.PlaceId?.trim() || null,
            row.invoiceitemname?.trim() || null,
            generateUUID(),
          ]
        );
        imported++;
      } catch (err) {
        skipped++;
        errors.push(`row: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } finally {
    client.release();
  }

  res.json({ imported, skipped, errors: errors.slice(0, 20) });
});

export const importRouter = router;
