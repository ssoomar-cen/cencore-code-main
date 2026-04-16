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
    console.log("🔄 Starting Invoice Item CSV import...\n");

    const defaultTenantId = process.env.DEFAULT_TENANT_ID || "default";
    console.log(`📋 Using Tenant ID: ${defaultTenantId}\n`);

    // Read the CSV file
    const itemsFile = path.join(__dirname, "../../../data/Invoice_Item_CEN__c.csv");
    
    if (!fs.existsSync(itemsFile)) {
      console.error(`❌ File not found: ${itemsFile}`);
      process.exit(1);
    }

    const itemsData = fs.readFileSync(itemsFile, "utf-8");
    const items = csv.parse(itemsData, {
      columns: true,
      skip_empty_lines: true,
    }) as RawInvoiceItem[];

    console.log(`📦 Found ${items.length} invoice items to import\n`);

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        // Get invoice ID from Salesforce ID
        let invoiceId: string | null = null;
        if (item["Invoice__c"]) {
          const invoiceResult = await client.query(
            `SELECT invoice_id FROM invoice WHERE salesforce_id = $1 LIMIT 1`,
            [item["Invoice__c"]]
          );
          if (invoiceResult.rows.length > 0) {
            invoiceId = invoiceResult.rows[0].invoice_id;
          }
        }

        // Skip if no invoice found
        if (!invoiceId) {
          skippedCount++;
          continue;
        }

        // Get energy program ID from Salesforce ID
        let energyProgramId: string | null = null;
        if (item["Energy_Program__c"]) {
          const programResult = await client.query(
            `SELECT energy_program_id FROM energy_program WHERE salesforce_id = $1 LIMIT 1`,
            [item["Energy_Program__c"]]
          );
          if (programResult.rows.length > 0) {
            energyProgramId = programResult.rows[0].energy_program_id;
          }
        }

        // Generate UUID for the invoice item
        const itemId = generateUUID();

        // Upsert the invoice item
        await client.query(
          `INSERT INTO invoice_item (
            invoice_item_id, tenant_id, invoice_id, energy_program_id,
            name, invoice_item_type, period_date,
            savings, current_cost_avoidance, previous_cost_avoidance,
            special_savings, previous_special_savings, current_less_previous,
            credit, fee_amount, d365_invoice_item_guid, salesforce_id,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, NOW(), NOW()
          )
          ON CONFLICT (d365_invoice_item_guid) DO UPDATE SET
            name = $5, invoice_item_type = $6, period_date = $7,
            savings = $8, current_cost_avoidance = $9, previous_cost_avoidance = $10,
            special_savings = $11, previous_special_savings = $12, current_less_previous = $13,
            credit = $14, fee_amount = $15, updated_at = NOW()
          WHERE invoice_item.d365_invoice_item_guid = $16`,
          [
            itemId,
            defaultTenantId,
            invoiceId,
            energyProgramId,
            item.Name?.trim() || null,
            item["Invoice_Item_Type__c"]?.trim() || null,
            parseDate(item["Period_Date__c"]),
            parseDecimal(item["Savings__c"]),
            parseDecimal(item["Current_Cost_Avoidance__c"]),
            parseDecimal(item["Previous_Cost_Avoidance__c"]),
            parseDecimal(item["Special_Savings__c"]),
            parseDecimal(item["Previous_Special_Savings__c"]),
            parseDecimal(item["Current_Less_Previous__c"]),
            parseDecimal(item["Credit__c"]),
            parseDecimal(item["Fee_Amount__c"]),
            item["D365InvoiceItemGuid__c"]?.trim() || null,
            item.Id,
          ]
        );

        importedCount++;

        if (importedCount % 50 === 0) {
          console.log(`✓ Imported ${importedCount} invoice items...`);
        }
      } catch (error) {
        skippedCount++;
        const errorMsg = `Failed to import invoice item "${item.Name}": ${error instanceof Error ? error.message : String(error)}`;
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
