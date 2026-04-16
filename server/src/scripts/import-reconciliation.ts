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

interface RawReconciliation {
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
    console.log("🔄 Starting Reconciliation CSV import...\n");

    const defaultTenantId = process.env.DEFAULT_TENANT_ID || "default";
    console.log(`📋 Using Tenant ID: ${defaultTenantId}\n`);

    // Read the CSV file
    const reconFile = path.join(__dirname, "../../../data/recon(in).csv");
    
    if (!fs.existsSync(reconFile)) {
      console.error(`❌ File not found: ${reconFile}`);
      process.exit(1);
    }

    const reconData = fs.readFileSync(reconFile, "utf-8");
    const reconciliations = csv.parse(reconData, {
      columns: true,
      skip_empty_lines: true,
    }) as RawReconciliation[];

    console.log(`📦 Found ${reconciliations.length} reconciliation records to import\n`);

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const recon of reconciliations) {
      try {
        // Get invoice item ID from Salesforce ID
        let invoiceItemId: string | null = null;
        if (recon.invoiceitemid) {
          const itemResult = await client.query(
            `SELECT invoice_item_id FROM invoice_item WHERE salesforce_id = $1 LIMIT 1`,
            [recon.invoiceitemid]
          );
          if (itemResult.rows.length > 0) {
            invoiceItemId = itemResult.rows[0].invoice_item_id;
          }
        }

        // Skip if no invoice item found
        if (!invoiceItemId) {
          skippedCount++;
          continue;
        }

        // Get energy program ID from D365 energy program ID (GUID)
        let energyProgramId: string | null = null;
        if (recon.EnergyProgram) {
          const programResult = await client.query(
            `SELECT energy_program_id FROM energy_program WHERE salesforce_id = $1 LIMIT 1`,
            [recon.EnergyProgram]
          );
          if (programResult.rows.length > 0) {
            energyProgramId = programResult.rows[0].energy_program_id;
          }
        }

        // Get invoice ID from the invoice item
        let invoiceId: string | null = null;
        const invoiceResult = await client.query(
          `SELECT invoice_id FROM invoice_item WHERE invoice_item_id = $1 LIMIT 1`,
          [invoiceItemId]
        );
        if (invoiceResult.rows.length > 0) {
          invoiceId = invoiceResult.rows[0].invoice_id;
        }

        // Generate UUID for the reconciliation record
        const reconId = generateUUID();

        // Insert the reconciliation record
        await client.query(
          `INSERT INTO invoice_recon (
            invoice_recon_id, tenant_id, invoice_item_id, invoice_id,
            org_name, place_info, logical_device_code, report_date, begin_date,
            category, current_batcc, previous_batcc, current_actual_cost,
            previous_actual_cost, current_ca, previous_ca, energy_program_id,
            sales_doc_name, place_id, invoice_item_name, salesforce_id,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21, NOW(), NOW()
          )`,
          [
            reconId,
            defaultTenantId,
            invoiceItemId,
            invoiceId,
            recon.Orgname?.trim() || null,
            recon.placeInfo?.trim() || null,
            recon.logicaldevicecode?.trim() || null,
            parseDate(recon.ReportDate),
            parseDate(recon.BeginDate),
            recon.Category?.trim() || null,
            parseDecimal(recon["Current BATCC"]),
            parseDecimal(recon["Previous BATCC"]),
            parseDecimal(recon["Current Actual Cost"]),
            parseDecimal(recon["Previous Actual Cost"]),
            parseDecimal(recon["Current CA"]),
            parseDecimal(recon["Previous CA"]),
            energyProgramId,
            recon.SalesDocName?.trim() || null,
            recon.PlaceId?.trim() || null,
            recon.invoiceitemname?.trim() || null,
            generateUUID(), // Generate a unique ID for this record
          ]
        );

        importedCount++;

        if (importedCount % 50 === 0) {
          console.log(`✓ Imported ${importedCount} reconciliation records...`);
        }
      } catch (error) {
        skippedCount++;
        const errorMsg = `Failed to import reconciliation record: ${error instanceof Error ? error.message : String(error)}`;
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
