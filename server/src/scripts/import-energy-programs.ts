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
    console.log("🔄 Starting Energy Program CSV import...\n");

    const defaultTenantId = process.env.DEFAULT_TENANT_ID || "default";
    console.log(`📋 Using Tenant ID: ${defaultTenantId}\n`);

    // Read the CSV file
    const programsFile = path.join(__dirname, "../../../data/Energy_Program__c.csv");
    
    if (!fs.existsSync(programsFile)) {
      console.error(`❌ File not found: ${programsFile}`);
      process.exit(1);
    }

    const programsData = fs.readFileSync(programsFile, "utf-8");
    const programs = csv.parse(programsData, {
      columns: true,
      skip_empty_lines: true,
    }) as RawEnergyProgram[];

    console.log(`📦 Found ${programs.length} energy programs to import\n`);

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const program of programs) {
      try {
        // Skip if name is empty
        if (!program.Name || program.Name.trim() === "") {
          skippedCount++;
          continue;
        }

        // Get account ID from salesforce organization ID
        let accountId: string | null = null;
        if (program["Organization__c"]) {
          const accountResult = await client.query(
            `SELECT id FROM accounts WHERE salesforce_id = $1 LIMIT 1`,
            [program["Organization__c"]]
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

        // Generate UUID for the energy program
        const programId = generateUUID();

        // Upsert the energy program
        await client.query(
          `INSERT INTO energy_program (
            energy_program_id, name, account_id, salesforce_id,
            status, pgm_id, technical_lead, implementation_consultant,
            contract_start_date, billing_schedule_end_date, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
          ON CONFLICT (salesforce_id) DO UPDATE SET
            name = $2, account_id = $3,
            status = $5, pgm_id = $6, technical_lead = $7,
            implementation_consultant = $8,
            contract_start_date = $9, billing_schedule_end_date = $10,
            updated_at = NOW()`,
          [
            programId,
            program.Name.trim(),
            accountId,
            program.Id,
            program["Status__c"]?.trim() || null,
            program["pgmId__c"]?.trim() || null,
            program["Technical_Lead__c"]?.trim() || null,
            program["Implementation_Consultant__c"]?.trim() || null,
            parseDate(program["Contract_Start_Date__c"]),
            parseDate(program["Billing_Schedule_End_Date__c"]),
          ]
        );

        importedCount++;

        if (importedCount % 50 === 0) {
          console.log(`✓ Imported ${importedCount} energy programs...`);
        }
      } catch (error) {
        skippedCount++;
        const errorMsg = `Failed to import energy program "${program.Name}": ${error instanceof Error ? error.message : String(error)}`;
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
