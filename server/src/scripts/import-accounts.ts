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

interface RawAccount {
  Id: string;
  Name: string;
  Industry?: string;
  Type?: string;
  BillingState?: string;
  BillingPostalCode?: string;
  BillingCountry?: string;
  BillingStreet?: string;
  BillingCity?: string;
  Phone?: string;
  Website?: string;
  "Org_Legal_Name__c"?: string;
  "Org_Type__c"?: string;
  "Contract_Status__c"?: string;
  Status__c?: string;
}

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function main() {
  const client = await pool.connect();
  try {
    console.log("🔄 Starting Account CSV import...\n");

    // Get or create default organization and team
    const defaultOrgId = process.env.DEFAULT_ORG_ID || "org_default";
    const defaultTeamId = process.env.DEFAULT_TEAM_ID || "team_default";

    console.log(`📋 Using Org ID: ${defaultOrgId}`);
    console.log(`📋 Using Team ID: ${defaultTeamId}\n`);

    // Read the CSV file
    const accountsFile = path.join(__dirname, "../../../data/Account.csv");
    
    if (!fs.existsSync(accountsFile)) {
      console.error(`❌ File not found: ${accountsFile}`);
      process.exit(1);
    }

    const accountsData = fs.readFileSync(accountsFile, "utf-8");
    const accounts = csv.parse(accountsData, {
      columns: true,
      skip_empty_lines: true,
    }) as RawAccount[];

    console.log(`📦 Found ${accounts.length} accounts to import\n`);

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const account of accounts) {
      try {
        // Skip if name is empty
        if (!account.Name || account.Name.trim() === "") {
          skippedCount++;
          continue;
        }

        // Determine region from state or country
        const region = account.BillingState?.trim() || account.BillingCountry?.trim() || "Unknown";

        // Generate UUID for the account
        const accountId = generateUUID();

        // Upsert the account using raw SQL
        await client.query(
          `INSERT INTO accounts (
            id, name, industry, region, team_id, org_id, 
            salesforce_id, org_legal_name, org_type, 
            billing_street, billing_city, billing_state, 
            billing_postal_code, billing_country, phone, website, 
            status, contract_status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
          ON CONFLICT (salesforce_id) DO UPDATE SET
            name = $2, industry = $3, region = $4,
            org_legal_name = $8, org_type = $9,
            billing_street = $10, billing_city = $11, billing_state = $12,
            billing_postal_code = $13, billing_country = $14,
            phone = $15, website = $16, status = $17, contract_status = $18,
            updated_at = NOW()`,
          [
            accountId,
            account.Name.trim(),
            account.Industry?.trim() || null,
            region,
            defaultTeamId,
            defaultOrgId,
            account.Id,
            account["Org_Legal_Name__c"]?.trim() || null,
            account["Org_Type__c"]?.trim() || null,
            account.BillingStreet?.trim() || null,
            account.BillingCity?.trim() || null,
            account.BillingState?.trim() || null,
            account.BillingPostalCode?.trim() || null,
            account.BillingCountry?.trim() || null,
            account.Phone?.trim() || null,
            account.Website?.trim() || null,
            account.Status__c?.trim() || null,
            account["Contract_Status__c"]?.trim() || null,
          ]
        );

        importedCount++;

        if (importedCount % 50 === 0) {
          console.log(`✓ Imported ${importedCount} accounts...`);
        }
      } catch (error) {
        skippedCount++;
        const errorMsg = `Failed to import account "${account.Name}": ${error instanceof Error ? error.message : String(error)}`;
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
