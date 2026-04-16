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

interface RawBuilding {
  Id: string;
  Name: string;
  "Energy_Program__c"?: string;
  "Building_No__c"?: string;
  "Place_Code__c"?: string;
  "Place_Id__c"?: string;
  "Status__c"?: string;
  "Status_Reason__c"?: string;
  "Address_1__c"?: string;
  "Address_2__c"?: string;
  "City__c"?: string;
  "State__c"?: string;
  "Zip__c"?: string;
  "Primary_Use__c"?: string;
  "Square_Footage__c"?: string;
  "Building_D365_Id__c"?: string;
  "Ecap_Building_Id__c"?: string;
  "Ecap_Owner__c"?: string;
  "Measure_Building_ID__c"?: string;
  "Exclude_from_GreenX__c"?: string;
}

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function parseCsvBoolean(value?: string): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true";
}

function parseFloat_(value?: string): number | null {
  if (!value || value.trim() === "") return null;
  const n = parseFloat(value.trim());
  return isNaN(n) ? null : n;
}

async function main() {
  const client = await pool.connect();
  try {
    console.log("🔄 Starting Building CSV import...\n");

    // Verify buildings table exists
    const tableCheck = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'buildings'
       ORDER BY ordinal_position`
    );

    if (tableCheck.rows.length === 0) {
      console.error("❌ Table 'buildings' does not exist in the database.");
      process.exit(1);
    }

    console.log(
      `✓ Found 'buildings' table with ${tableCheck.rows.length} columns: ${tableCheck.rows.map((r: { column_name: string }) => r.column_name).join(", ")}\n`
    );

    const defaultTenantId = process.env.DEFAULT_TENANT_ID || "default";
    console.log(`📋 Using Tenant ID: ${defaultTenantId}\n`);

    // Read the CSV file
    const buildingsFile = path.join(__dirname, "../../../data/Building__c.csv");

    if (!fs.existsSync(buildingsFile)) {
      console.error(`❌ File not found: ${buildingsFile}`);
      process.exit(1);
    }

    const buildingsData = fs.readFileSync(buildingsFile, "utf-8");
    const buildings = csv.parse(buildingsData, {
      columns: true,
      skip_empty_lines: true,
    }) as RawBuilding[];

    console.log(`📦 Found ${buildings.length} buildings to import\n`);

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const building of buildings) {
      try {
        // Skip if name is empty
        if (!building.Name || building.Name.trim() === "") {
          skippedCount++;
          continue;
        }

        // Resolve energy_program_id and account_id via energy program salesforce ID
        let energyProgramId: string | null = null;
        let accountId: string | null = null;

        if (building["Energy_Program__c"]) {
          const epResult = await client.query(
            `SELECT energy_program_id, account_id FROM energy_program WHERE salesforce_id = $1 LIMIT 1`,
            [building["Energy_Program__c"]]
          );
          if (epResult.rows.length > 0) {
            energyProgramId = epResult.rows[0].energy_program_id;
            accountId = epResult.rows[0].account_id;
          }
        }

        // Generate UUID for the building
        const buildingId = generateUUID();

        // Insert the building
        await client.query(
          `INSERT INTO buildings (
            id, name, account_id, energy_program_id, tenant_id,
            building_no, place_code, place_id,
            status, status_reason,
            address_street, address_2, address_city, address_state, address_zip,
            primary_use, square_footage,
            exclude_from_greenx,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8,
            $9, $10,
            $11, $12, $13, $14, $15,
            $16, $17,
            $18,
            NOW(), NOW()
          )
          ON CONFLICT (id) DO NOTHING`,
          [
            buildingId,
            building.Name.trim(),
            accountId,
            energyProgramId,
            defaultTenantId,
            building["Building_No__c"]?.trim() || null,
            building["Place_Code__c"]?.trim() || null,
            building["Place_Id__c"]?.trim() || null,
            building["Status__c"]?.trim() || null,
            building["Status_Reason__c"]?.trim() || null,
            building["Address_1__c"]?.trim() || null,
            building["Address_2__c"]?.trim() || null,
            building["City__c"]?.trim() || null,
            building["State__c"]?.trim() || null,
            building["Zip__c"]?.trim() || null,
            building["Primary_Use__c"]?.trim() || null,
            parseFloat_(building["Square_Footage__c"]),
            parseCsvBoolean(building["Exclude_from_GreenX__c"]),
          ]
        );

        importedCount++;

        if (importedCount % 50 === 0) {
          console.log(`✓ Imported ${importedCount} buildings...`);
        }
      } catch (error) {
        skippedCount++;
        const errorMsg = `Failed to import building "${building.Name}": ${error instanceof Error ? error.message : String(error)}`;
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

    if (errors.length > 0) {
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
