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
  Type?: string;
  Industry?: string;
  BillingState?: string;
  BillingCountry?: string;
}

interface RawContract {
  Id: string;
  Name: string;
  Organization__c?: string;
  Contract_Status__c?: string;
}

interface RawEnergyProgram {
  Id: string;
  Name: string;
  Organization__c?: string;
}

interface RawInvoice {
  Id: string;
  Name: string;
  Contract__c?: string;
  Energy_Program__c?: string;
  Invoice_Total__c?: string;
}

interface RawInvoiceItem {
  Id: string;
  Invoice__c?: string;
  Fee_Amount__c?: string;
}

function parseDecimal(value: string | undefined): number | undefined {
  if (!value || value.trim() === "") return undefined;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? undefined : parsed;
}

function parseDate(value: string | undefined): string | undefined {
  if (!value || value.trim() === "") return undefined;
  try {
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date.toISOString().split("T")[0];
  } catch {
    return undefined;
  }
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    console.log("🔄 Starting data import...");

    const accountMap: Record<string, string> = {};

    // Step 1: Import Accounts
    console.log("\n📦 Importing Accounts...");
    const accountsFile = path.join(__dirname, "../..", "data", "Account.csv");
    if (fs.existsSync(accountsFile)) {
      const accountsData = fs.readFileSync(accountsFile, "utf-8");
      const accounts = csv.parse(accountsData, {
        columns: true,
        skip_empty_lines: true,
      }) as RawAccount[];

      for (const account of accounts) {
        try {
          const uuid = crypto.randomUUID?.() || account.Id;
          await client.query(
            `INSERT INTO accounts (id, "accountName", "accountNumber", industry, "billingState", "salesforceId")
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT ("salesforceId") DO NOTHING`,
            [uuid, account.Name, account.Id, account.Industry, account.BillingState, account.Id]
          );
          accountMap[account.Id] = uuid;
        } catch (error) {
          console.error(`Failed to import account ${account.Name}:`, error);
        }
      }
      console.log(`✅ Imported ${Object.keys(accountMap).length} accounts`);
    }

    // Step 2: Import Contracts
    console.log("\n📦 Importing Contracts...");
    const contractsFile = path.join(__dirname, "../..", "data", "Contract_CEN__c.csv");
    if (fs.existsSync(contractsFile)) {
      const contractsData = fs.readFileSync(contractsFile, "utf-8");
      const contracts = csv.parse(contractsData, {
        columns: true,
        skip_empty_lines: true,
      }) as RawContract[];

      let contractCount = 0;
      for (const contract of contracts) {
        try {
          const accountId = contract.Organization__c ? accountMap[contract.Organization__c] : undefined;
          if (!accountId) continue;

          const uuid = crypto.randomUUID?.() || contract.Id;
          await client.query(
            `INSERT INTO contracts (id, "contractName", "contractNumber", "accountId", status, "salesforceId")
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT ("salesforceId") DO NOTHING`,
            [uuid, contract.Name, contract.Id, accountId, contract.Contract_Status__c, contract.Id]
          );
          contractCount++;
        } catch (error) {
          console.error(`Failed to import contract ${contract.Name}:`, error);
        }
      }
      console.log(`✅ Imported ${contractCount} contracts`);
    }

    // Step 3: Import Energy Programs
    console.log("\n📦 Importing Energy Programs...");
    const programsFile = path.join(__dirname, "../..", "data", "Energy_Program__c.csv");
    if (fs.existsSync(programsFile)) {
      const programsData = fs.readFileSync(programsFile, "utf-8");
      const programs = csv.parse(programsData, {
        columns: true,
        skip_empty_lines: true,
      }) as RawEnergyProgram[];

      let programCount = 0;
      for (const program of programs) {
        try {
          const accountId = program.Organization__c ? accountMap[program.Organization__c] : undefined;
          if (!accountId) continue;

          const uuid = crypto.randomUUID?.() || program.Id;
          await client.query(
            `INSERT INTO energy_programs (id, "programName", "programType", "accountId", "salesforceId")
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT ("salesforceId") DO NOTHING`,
            [uuid, program.Name, "Program", accountId, program.Id]
          );
          programCount++;
        } catch (error) {
          console.error(`Failed to import program ${program.Name}:`, error);
        }
      }
      console.log(`✅ Imported ${programCount} energy programs`);
    }

    // Step 4: Import Invoices
    console.log("\n📦 Importing Invoices...");
    const invoicesFile = path.join(__dirname, "../..", "data", "Invoice__c.csv");
    if (fs.existsSync(invoicesFile)) {
      const invoicesData = fs.readFileSync(invoicesFile, "utf-8");
      const invoices = csv.parse(invoicesData, {
        columns: true,
        skip_empty_lines: true,
      }) as RawInvoice[];

      let invoiceCount = 0;
      for (const invoice of invoices) {
        try {
          const accountId = invoice.Contract__c ? accountMap[invoice.Contract__c] : undefined;
          if (!accountId) continue;

          const uuid = crypto.randomUUID?.() || invoice.Id;
          await client.query(
            `INSERT INTO invoices (id, "invoiceNumber", "invoiceAmount", "accountId", status, "salesforceId")
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT ("salesforceId") DO NOTHING`,
            [
              uuid,
              invoice.Name,
              parseDecimal(invoice.Invoice_Total__c),
              accountId,
              "Open",
              invoice.Id,
            ]
          );
          invoiceCount++;
        } catch (error) {
          console.error(`Failed to import invoice ${invoice.Name}:`, error);
        }
      }
      console.log(`✅ Imported ${invoiceCount} invoices`);
    }

    // Step 5: Energy CRM demo entities (Portfolio / Campus / Building).
    // Opt-in via SEED_ENERGY_DEMO=1 so this is only attempted after the
    // new tables have been migrated. Safe to rerun — inserts are idempotent
    // on (tenant_id, name) lookups.
    if (process.env.SEED_ENERGY_DEMO === "1") {
      console.log("\n🏫 Seeding energy CRM demo entities...");
      const anchorAccountId = Object.values(accountMap)[0];
      if (!anchorAccountId) {
        console.log("⚠️  No anchor account available — skipping energy demo seed.");
      } else {
        const demoTenantId = process.env.SEED_TENANT_ID || "00000000-0000-0000-0000-000000000001";

        const existingPortfolio = await client.query<{ portfolio_id: string }>(
          `SELECT portfolio_id FROM portfolio WHERE tenant_id = $1 AND name = $2`,
          [demoTenantId, "Demo ISD Energy Portfolio"],
        );
        const portfolioId =
          existingPortfolio.rows[0]?.portfolio_id ?? crypto.randomUUID();
        if (!existingPortfolio.rows[0]) {
          await client.query(
            `INSERT INTO portfolio (portfolio_id, tenant_id, account_id, name, description, sector)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              portfolioId,
              demoTenantId,
              anchorAccountId,
              "Demo ISD Energy Portfolio",
              "Seeded district-wide portfolio for energy conservation demo.",
              "K12",
            ],
          );
        }

        const campuses = [
          { name: "North Campus", city: "Austin", state: "TX", zip: "78701", climateZone: "2A" },
          { name: "South Campus", city: "Austin", state: "TX", zip: "78704", climateZone: "2A" },
        ];
        const campusIds: Record<string, string> = {};
        for (const c of campuses) {
          const existing = await client.query<{ campus_id: string }>(
            `SELECT campus_id FROM campus WHERE portfolio_id = $1 AND name = $2`,
            [portfolioId, c.name],
          );
          const campusId = existing.rows[0]?.campus_id ?? crypto.randomUUID();
          if (!existing.rows[0]) {
            await client.query(
              `INSERT INTO campus (campus_id, tenant_id, portfolio_id, name, city, state, zip, climate_zone)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [campusId, demoTenantId, portfolioId, c.name, c.city, c.state, c.zip, c.climateZone],
            );
          }
          campusIds[c.name] = campusId;
        }

        const buildings = [
          { name: "Jefferson Elementary", buildingNo: "E-01", campus: "North Campus", primaryUse: "K-12 School", sqft: 65000, yearBuilt: 1998 },
          { name: "Lincoln Middle School", buildingNo: "M-01", campus: "North Campus", primaryUse: "K-12 School", sqft: 110000, yearBuilt: 2004 },
          { name: "Roosevelt High School", buildingNo: "H-01", campus: "South Campus", primaryUse: "K-12 School", sqft: 215000, yearBuilt: 1989 },
        ];
        let buildingInsertCount = 0;
        for (const b of buildings) {
          const existing = await client.query<{ building_id: string }>(
            `SELECT building_id FROM building WHERE tenant_id = $1 AND name = $2`,
            [demoTenantId, b.name],
          );
          if (existing.rows[0]) continue;
          await client.query(
            `INSERT INTO building (
               building_id, tenant_id, account_id, portfolio_id, campus_id,
               name, building_no, primary_use, sector, status,
               square_footage, gross_sq_ft, year_built, climate_zone,
               city, state, zip, country
             )
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
            [
              crypto.randomUUID(),
              demoTenantId,
              anchorAccountId,
              portfolioId,
              campusIds[b.campus],
              b.name,
              b.buildingNo,
              b.primaryUse,
              "K12",
              "Active",
              b.sqft,
              b.sqft,
              b.yearBuilt,
              "2A",
              "Austin",
              "TX",
              "78701",
              "US",
            ],
          );
          buildingInsertCount++;
        }
        console.log(`✅ Energy demo seeded: 1 portfolio, ${Object.keys(campusIds).length} campuses, ${buildingInsertCount} new buildings`);

        // Assets — a representative K-12 equipment complement per building.
        // Skip any building that already has ≥1 asset so re-running the seed
        // is safe.
        const assetTemplate: Array<{
          name: string;
          assetTag: string;
          category: string;
          subtype: string;
          location: string | null;
          manufacturer: string | null;
          model: string | null;
          installYear: number;
          expectedLifeYears: number;
          capacity: number | null;
          capacityUnit: string | null;
          condition: string;
          replacementCost: number | null;
        }> = [
          { name: "RTU-1 Roof",           assetTag: "RTU-01", category: "HVAC",        subtype: "RTU",              location: "Roof",            manufacturer: "Carrier",   model: "48HC",     installYear: 2006, expectedLifeYears: 18, capacity: 25,     capacityUnit: "tons",   condition: "FAIR",       replacementCost: 45000 },
          { name: "RTU-2 Roof",           assetTag: "RTU-02", category: "HVAC",        subtype: "RTU",              location: "Roof",            manufacturer: "Carrier",   model: "48HC",     installYear: 2006, expectedLifeYears: 18, capacity: 25,     capacityUnit: "tons",   condition: "FAIR",       replacementCost: 45000 },
          { name: "Boiler-1",             assetTag: "BLR-01", category: "HVAC",        subtype: "Hot Water Boiler", location: "Mechanical Room", manufacturer: "Cleaver-Brooks", model: "CB-LE", installYear: 1998, expectedLifeYears: 25, capacity: 2000000, capacityUnit: "BTU/hr", condition: "POOR",       replacementCost: 85000 },
          { name: "BAS Controller",       assetTag: "BAS-01", category: "CONTROLS",    subtype: "BACnet Supervisor",location: "Mechanical Room", manufacturer: "Johnson Controls", model: "Metasys", installYear: 2012, expectedLifeYears: 15, capacity: null,   capacityUnit: null,     condition: "GOOD",       replacementCost: 18000 },
          { name: "Interior Lighting",    assetTag: "LTG-01", category: "LIGHTING",    subtype: "T8 Fluorescent",   location: "Classrooms",      manufacturer: null,        model: null,       installYear: 2001, expectedLifeYears: 22, capacity: null,   capacityUnit: null,     condition: "END_OF_LIFE", replacementCost: 120000 },
          { name: "Exterior Lighting",    assetTag: "LTG-02", category: "LIGHTING",    subtype: "HID Pole",         location: "Parking",         manufacturer: null,        model: null,       installYear: 2001, expectedLifeYears: 20, capacity: null,   capacityUnit: null,     condition: "POOR",       replacementCost: 28000 },
          { name: "DHW Heater",           assetTag: "DHW-01", category: "DHW",         subtype: "Gas Water Heater", location: "Mechanical Room", manufacturer: "A. O. Smith", model: "BTH-250", installYear: 2010, expectedLifeYears: 12, capacity: 199000, capacityUnit: "BTU/hr", condition: "FAIR",       replacementCost: 9500 },
        ];

        let assetInsertCount = 0;
        for (const buildingName of buildings.map((b) => b.name)) {
          const bRow = await client.query<{ building_id: string }>(
            `SELECT building_id FROM building WHERE tenant_id = $1 AND name = $2`,
            [demoTenantId, buildingName],
          );
          const buildingId = bRow.rows[0]?.building_id;
          if (!buildingId) continue;
          const existingAssets = await client.query<{ count: string }>(
            `SELECT COUNT(*)::text AS count FROM asset WHERE building_id = $1`,
            [buildingId],
          );
          if (parseInt(existingAssets.rows[0]?.count ?? "0") > 0) continue;

          for (const a of assetTemplate) {
            await client.query(
              `INSERT INTO asset (
                 asset_id, tenant_id, building_id,
                 name, asset_tag, category, subtype,
                 location, manufacturer, model,
                 install_year, expected_life_years,
                 capacity, capacity_unit,
                 condition, status, replacement_cost
               )
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
              [
                crypto.randomUUID(),
                demoTenantId,
                buildingId,
                a.name,
                a.assetTag,
                a.category,
                a.subtype,
                a.location,
                a.manufacturer,
                a.model,
                a.installYear,
                a.expectedLifeYears,
                a.capacity,
                a.capacityUnit,
                a.condition,
                "ACTIVE",
                a.replacementCost,
              ],
            );
            assetInsertCount++;
          }
        }
        console.log(`✅ Energy demo seeded: ${assetInsertCount} assets across ${buildings.length} buildings`);
      }
    }

    await client.query("COMMIT");
    console.log("\n✅ Data import completed successfully!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Data import failed:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
