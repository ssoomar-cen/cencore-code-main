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

async function main() {
  const client = await pool.connect();
  try {
    console.log("🔄 Starting Contract CSV import...\n");

    const defaultTenantId = process.env.DEFAULT_TENANT_ID || "default";
    console.log(`📋 Using Tenant ID: ${defaultTenantId}\n`);

    // Read the CSV file
    const contractsFile = path.join(__dirname, "../../../data/Contract_CEN__c.csv");
    
    if (!fs.existsSync(contractsFile)) {
      console.error(`❌ File not found: ${contractsFile}`);
      process.exit(1);
    }

    const contractsData = fs.readFileSync(contractsFile, "utf-8");
    const contracts = csv.parse(contractsData, {
      columns: true,
      skip_empty_lines: true,
    }) as RawContract[];

    console.log(`📦 Found ${contracts.length} contracts to import\n`);

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const contract of contracts) {
      try {
        // Skip if name is empty
        if (!contract.Name || contract.Name.trim() === "") {
          skippedCount++;
          continue;
        }

        // Get account ID from salesforce organization ID
        let accountId: string | null = null;
        if (contract["Organization_Name__c"]) {
          const accountResult = await client.query(
            `SELECT id FROM accounts WHERE salesforce_id = $1 LIMIT 1`,
            [contract["Organization_Name__c"]]
          );
          if (accountResult.rows.length > 0) {
            accountId = accountResult.rows[0].id;
          }
        }
        
        // Skip if no account found (required field)
        if (!accountId) {
          skippedCount++;
          continue;
        }

        // Generate UUID for the contract
        const contractId = generateUUID();

        // Upsert the contract
        await client.query(
          `INSERT INTO contract (
            contract_id, name, account_id, salesforce_id,
            contract_status, contract_type, contract_term,
            contract_start_date, billing_schedule_end_date,
            client_manager, service_status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
          ON CONFLICT (salesforce_id) DO UPDATE SET
            name = $2, account_id = $3,
            contract_status = $5, contract_type = $6, contract_term = $7,
            contract_start_date = $8, billing_schedule_end_date = $9,
            client_manager = $10, service_status = $11,
            updated_at = NOW()`,
          [
            contractId,
            contract.Name.trim(),
            accountId,
            contract.Id,
            contract["Contract_Status__c"]?.trim() || null,
            contract["Contract_Type__c"]?.trim() || null,
            contract["Contract_Term__c"]?.trim() || null,
            parseDate(contract["Contract_Start_Date__c"]),
            parseDate(contract["Billing_Schedule_End_Date__c"]),
            contract["Client_Manager__c"]?.trim() || null,
            contract["Service_Status__c"]?.trim() || null,
          ]
        );

        importedCount++;

        if (importedCount % 50 === 0) {
          console.log(`✓ Imported ${importedCount} contracts...`);
        }
      } catch (error) {
        skippedCount++;
        const errorMsg = `Failed to import contract "${contract.Name}": ${error instanceof Error ? error.message : String(error)}`;
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
