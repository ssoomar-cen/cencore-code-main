import "dotenv/config";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import * as csv from "csv-parse/sync";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://localhost/cencore",
});

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
  "Description__c"?: string;
  "Intacct_State__c"?: string;
  "Intacct_Status__c"?: string;
  "Post_Date__c"?: string;
  "Invoice_Total__c"?: string;
  "Credit_Total__c"?: string;
  "Document_Type__c"?: string;
  "Applied_Payment_Date__c"?: string;
  "CRGBIInvoiceid__c"?: string;
  "D365Contractid__c"?: string;
  "D365EnergyProgramid__c"?: string;
  "Legacy_Source__c"?: string;
  "Invoice_Total_Rollup__c"?: string;
  "Customerid__c"?: string;
  "Invoice_Name__c"?: string;
  "Bill_Month__c"?: string;
  "Item_ID__c"?: string;
  "Contract_Amount__c"?: string;
  "Generated_External_ID__c"?: string;
  "Invoice_Name_TK__c"?: string;
}

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function parseDate(dateString?: string): string | null {
  if (!dateString || dateString.trim() === "") return null;
  try {
    const parsed = new Date(dateString);
    if (isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
  } catch {
    return null;
  }
}

function parseDecimal(value?: string): number | null {
  if (!value || value.trim() === "") return null;
  try {
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  } catch {
    return null;
  }
}

async function main() {
  const client = await pool.connect();
  try {
    console.log("🔄 Starting Invoice CSV import...\n");

    const defaultTenantId = process.env.DEFAULT_TENANT_ID || "default";
    console.log(`📋 Using Tenant ID: ${defaultTenantId}\n`);

    // Read the CSV file
    const invoicesFile = path.join(__dirname, "../../../data/Invoice_CEN__c.csv");
    
    if (!fs.existsSync(invoicesFile)) {
      console.error(`❌ File not found: ${invoicesFile}`);
      process.exit(1);
    }

    const invoicesData = fs.readFileSync(invoicesFile, "utf-8");
    const invoices = csv.parse(invoicesData, {
      columns: true,
      skip_empty_lines: true,
    }) as RawInvoice[];

    console.log(`📦 Found ${invoices.length} invoices to import\n`);

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const invoice of invoices) {
      try {
        // Skip if name is empty
        if (!invoice.Name || invoice.Name.trim() === "") {
          skippedCount++;
          continue;
        }

        // Get contract ID from Salesforce ID
        let contractId: string | null = null;
        if (invoice["Contract__c"]) {
          const contractResult = await client.query(
            `SELECT contract_id FROM contract WHERE salesforce_id = $1 LIMIT 1`,
            [invoice["Contract__c"]]
          );
          if (contractResult.rows.length > 0) {
            contractId = contractResult.rows[0].contract_id;
          }
        }

        // Get energy program ID from Salesforce ID
        let energyProgramId: string | null = null;
        if (invoice["Energy_Program__c"]) {
          const programResult = await client.query(
            `SELECT energy_program_id FROM energy_program WHERE salesforce_id = $1 LIMIT 1`,
            [invoice["Energy_Program__c"]]
          );
          if (programResult.rows.length > 0) {
            energyProgramId = programResult.rows[0].energy_program_id;
          }
        }

        // Get account ID from contract or program
        let accountId: string | null = null;
        if (contractId) {
          const accountResult = await client.query(
            `SELECT account_id FROM contract WHERE contract_id = $1 LIMIT 1`,
            [contractId]
          );
          if (accountResult.rows.length > 0) {
            accountId = accountResult.rows[0].account_id;
          }
        } else if (energyProgramId) {
          const accountResult = await client.query(
            `SELECT account_id FROM energy_program WHERE energy_program_id = $1 LIMIT 1`,
            [energyProgramId]
          );
          if (accountResult.rows.length > 0) {
            accountId = accountResult.rows[0].account_id;
          }
        }

        // Generate UUID for the invoice
        const invoiceId = generateUUID();

        // Upsert the invoice
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
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
            $31, NOW(), NOW()
          )
          ON CONFLICT (salesforce_id) DO UPDATE SET
            name = $6, invoice_name = $7, invoice_name_tk = $8,
            document_type = $10, due_date = $11, bill_month = $12,
            post_date = $13, scheduled_date = $14, cycle_end_date = $15,
            date_delivered = $16, applied_payment_date = $17,
            invoice_total = $18, credit_total = $19, contract_amount = $20,
            applied_amount = $21, intacct_state = $22, intacct_status = $23,
            ready_for_billing = $24, run_reconciliation = $25,
            generated_external_id = $26, d365_contract_id = $28,
            d365_energy_program_id = $29, legacy_source = $30, customer_id = $31,
            updated_at = NOW()`,
          [
            invoiceId,
            defaultTenantId,
            accountId,
            contractId,
            energyProgramId,
            invoice.Name.trim(),
            invoice["Invoice_Name__c"]?.trim() || null,
            invoice["Invoice_Name_TK__c"]?.trim() || null,
            invoice["Invoice_ID__c"]?.trim() || null,
            invoice["Document_Type__c"]?.trim() || null,
            parseDate(invoice["Due_Date__c"]),
            parseDate(invoice["Bill_Month__c"]),
            parseDate(invoice["Post_Date__c"]),
            parseDate(invoice["Scheduled_Date__c"]),
            parseDate(invoice["Cycle_End_Date__c"]),
            parseDate(invoice["Date_Delivered__c"]),
            parseDate(invoice["Applied_Payment_Date__c"]),
            parseDecimal(invoice["Invoice_Total__c"]),
            parseDecimal(invoice["Credit_Total__c"]),
            parseDecimal(invoice["Contract_Amount__c"]),
            parseDecimal(invoice["Applied_Amount__c"]),
            invoice["Intacct_State__c"]?.trim() || null,
            invoice["Intacct_Status__c"]?.trim() || null,
            invoice["Ready_For_Billing__c"]?.trim() || null,
            invoice["Run_Reconciliation__c"]?.trim() || null,
            invoice["Generated_External_ID__c"]?.trim() || null,
            invoice.Id,
            invoice["D365Contractid__c"]?.trim() || null,
            invoice["D365EnergyProgramid__c"]?.trim() || null,
            invoice["Legacy_Source__c"]?.trim() || null,
            invoice["Customerid__c"]?.trim() || null,
          ]
        );

        importedCount++;

        if (importedCount % 50 === 0) {
          console.log(`✓ Imported ${importedCount} invoices...`);
        }
      } catch (error) {
        skippedCount++;
        const errorMsg = `Failed to import invoice "${invoice.Name}": ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log(`✅ Import Complete!`);
    console.log("=".repeat(60));
    console.log(`✓ Imported: ${importedCount}`);
    console.log(`⊘ Skipped: ${skippedCount}`);
    console.log(`✗ Errors: ${errors.length}`);

    if (errors.length > 0 && errors.length <= 10) {
      console.log("\nErrors:");
      errors.slice(0, 10).forEach((err) => console.log(`  • ${err}`));
      if (errors.length > 10) {
        console.log(`  ... and ${errors.length - 10} more`);
      }
    }

    console.log("=".repeat(60) + "\n");
  } catch (error) {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  } finally {
    await client.release();
    await pool.end();
  }
}

main();
