import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as csv from "csv-parse/sync";

const prisma = new PrismaClient();

interface RawAccount {
  Id: string;
  Name: string;
  Type?: string;
  Industry?: string;
  BillingState?: string;
  BillingCountry?: string;
  Org_Legal_Name__c?: string;
  Org_Type__c?: string;
  Phone?: string;
  Website?: string;
  Status__c?: string;
  Contract_Status__c?: string;
  BillingStreet?: string;
  BillingCity?: string;
  BillingPostalCode?: string;
}

interface RawContract {
  Id: string;
  Name: string;
  Organization__c?: string;
  Contract_Status__c?: string;
  Contract_Type__c?: string;
  Contract_Term__c?: string;
  Contract_Start_Date__c?: string;
  Billing_Schedule_End_Date__c?: string;
  Client_Manager__c?: string;
  Service_Status__c?: string;
}

interface RawEnergyProgram {
  Id: string;
  Name: string;
  Organization__c?: string;
  Status__c?: string;
  pgmId__c?: string;
  Technical_Lead__c?: string;
  Implementation_Consultant__c?: string;
  Contract_Start_Date__c?: string;
  Billing_Schedule_End_Date__c?: string;
}

interface RawInvoice {
  Id: string;
  Name: string;
  Invoice_ID__c?: string;
  Contract__c?: string;
  Energy_Program__c?: string;
  Invoice_Total__c?: string;
  Applied_Amount__c?: string;
  Contract_Amount__c?: string;
  Credit_Total__c?: string;
  Document_Type__c?: string;
  Due_Date__c?: string;
  Bill_Month__c?: string;
  Post_Date__c?: string;
  Scheduled_Date__c?: string;
  Cycle_End_Date__c?: string;
  Date_Delivered__c?: string;
  Applied_Payment_Date__c?: string;
  Invoice_Name__c?: string;
  Invoice_Name_TK__c?: string;
  Intacct_Status__c?: string;
  Intacct_State__c?: string;
  Item_ID__c?: string;
  Customerid__c?: string;
  Billing_Wizard__c?: string;
  Ready_For_Billing__c?: string;
  Run_Reconciliation__c?: string;
}

interface RawInvoiceItem {
  Id: string;
  Name: string;
  Invoice__c?: string;
  Energy_Program__c?: string;
  Fee_Amount__c?: string;
  Current_Cost_Avoidance__c?: string;
  Previous_Cost_Avoidance__c?: string;
  Special_Savings__c?: string;
  Previous_Special_Savings__c?: string;
  Current_Less_Previous__c?: string;
  Credit__c?: string;
  Period_Date__c?: string;
  Invoice_Item_Type__c?: string;
  Savings__c?: string;
  D365InvoiceItemGuid__c?: string;
}

interface RawRecon {
  Orgname: string;
  placeInfo: string;
  logicaldevicecode: string;
  ReportDate: string;
  Category: string;
  "Current BATCC": string;
  "Previous BATCC": string;
  "Current Actual Cost": string;
  "Previous Actual Cost": string;
  "Current CA": string;
  "Previous CA": string;
  BeginDate: string;
  EnergyProgram: string;
  SalesDocName: string;
  PlaceId: string;
  invoiceitemid: string;
  invoiceitemname: string;
}

const DEFAULT_TENANT_ID = "default-tenant";
const DEFAULT_TEAM_ID = "default-team";
const DEFAULT_ORG_ID = "default-org";

function parseDecimal(value: string | undefined): number | undefined {
  if (!value || value.trim() === "") return undefined;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? undefined : parsed;
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value || value.trim() === "") return undefined;
  try {
    // Handle ISO format dates
    if (value.includes("T")) {
      return new Date(value.split("T")[0]);
    }
    // Handle US date format
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  } catch {
    return undefined;
  }
}

async function main() {
  console.log("🔄 Starting data import...");

  try {
    // Step 1: Import Accounts
    console.log("\n📦 Importing Accounts...");
    const accountsFile = path.join(__dirname, "../..", "data", "Account.csv");
    const accountsData = fs.readFileSync(accountsFile, "utf-8");
    const accounts = csv.parse(accountsData, {
      columns: true,
      skip_empty_lines: true,
    }) as RawAccount[];

    const accountMap: Record<string, string> = {}; // Salesforce ID -> Prisma ID

    for (const account of accounts) {
      try {
        const created = await prisma.account.create({
          data: {
            name: account.Name,
            industry: account.Industry,
            region: account.BillingState,
            teamId: DEFAULT_TEAM_ID,
            orgId: DEFAULT_ORG_ID,
            salesforceId: account.Id,
            orgLegalName: account.Org_Legal_Name__c,
            orgType: account.Org_Type__c,
            billingStreet: account.BillingStreet,
            billingCity: account.BillingCity,
            billingState: account.BillingState,
            billingPostalCode: account.BillingPostalCode,
            billingCountry: account.BillingCountry,
            phone: account.Phone,
            website: account.Website,
            status: account.Status__c,
            contractStatus: account.Contract_Status__c,
          },
        });
        accountMap[account.Id] = created.id;
      } catch (error) {
        console.error(`Failed to create account ${account.Name}:`, error);
      }
    }

    console.log(`✅ Created ${Object.keys(accountMap).length} accounts`);

    // Step 2: Import Contracts
    console.log("\n📦 Importing Contracts...");
    const contractsFile = path.join(
      __dirname,
      "../..",
      "data",
      "Contract_CEN__c.csv"
    );
    const contractsData = fs.readFileSync(contractsFile, "utf-8");
    const contracts = csv.parse(contractsData, {
      columns: true,
      skip_empty_lines: true,
    }) as RawContract[];

    const contractMap: Record<string, string> = {}; // Salesforce ID -> Prisma ID

    for (const contract of contracts) {
      try {
        const accountId = contract.Organization__c
          ? accountMap[contract.Organization__c]
          : undefined;

        if (!accountId) {
          console.warn(
            `Skipping contract ${contract.Name}: Account not found`
          );
          continue;
        }

        const created = await prisma.contract.create({
          data: {
            name: contract.Name,
            salesforceId: contract.Id,
            accountId,
            contractStatus: contract.Contract_Status__c,
            contractType: contract.Contract_Type__c,
            contractTerm: contract.Contract_Term__c,
            contractStartDate: parseDate(contract.Contract_Start_Date__c),
            billingScheduleEndDate: parseDate(
              contract.Billing_Schedule_End_Date__c
            ),
            clientManager: contract.Client_Manager__c,
            serviceStatus: contract.Service_Status__c,
          },
        });
        contractMap[contract.Id] = created.id;
      } catch (error) {
        console.error(`Failed to create contract ${contract.Name}:`, error);
      }
    }

    console.log(`✅ Created ${Object.keys(contractMap).length} contracts`);

    // Step 3: Import Energy Programs
    console.log("\n📦 Importing Energy Programs...");
    const programsFile = path.join(
      __dirname,
      "../..",
      "data",
      "Energy_Program__c.csv"
    );
    const programsData = fs.readFileSync(programsFile, "utf-8");
    const programs = csv.parse(programsData, {
      columns: true,
      skip_empty_lines: true,
    }) as RawEnergyProgram[];

    const programMap: Record<string, string> = {}; // Salesforce ID -> Prisma ID

    for (const program of programs) {
      try {
        const accountId = program.Organization__c
          ? accountMap[program.Organization__c]
          : undefined;

        if (!accountId) {
          console.warn(
            `Skipping energy program ${program.Name}: Account not found`
          );
          continue;
        }

        const created = await prisma.energyProgram.create({
          data: {
            name: program.Name,
            salesforceId: program.Id,
            accountId,
            status: program.Status__c,
            pgmId: program.pgmId__c,
            technicalLead: program.Technical_Lead__c,
            implementationConsultant: program.Implementation_Consultant__c,
            contractStartDate: parseDate(program.Contract_Start_Date__c),
            billingScheduleEndDate: parseDate(
              program.Billing_Schedule_End_Date__c
            ),
          },
        });
        programMap[program.Id] = created.id;
      } catch (error) {
        console.error(`Failed to create energy program ${program.Name}:`, error);
      }
    }

    console.log(
      `✅ Created ${Object.keys(programMap).length} energy programs`
    );

    // Step 4: Import Invoices
    console.log("\n📦 Importing Invoices...");
    const invoicesFile = path.join(
      __dirname,
      "../..",
      "data",
      "Invoice_CEN__c.csv"
    );
    const invoicesData = fs.readFileSync(invoicesFile, "utf-8");
    const invoices = csv.parse(invoicesData, {
      columns: true,
      skip_empty_lines: true,
    }) as RawInvoice[];

    const invoiceMap: Record<string, string> = {}; // Salesforce ID -> Prisma ID

    for (const invoice of invoices) {
      try {
        const contractId = invoice.Contract__c
          ? contractMap[invoice.Contract__c]
          : undefined;
        const programId = invoice.Energy_Program__c
          ? programMap[invoice.Energy_Program__c]
          : undefined;

        // Get account from contract or program if available
        let accountId: string | undefined;
        if (contractId) {
          const contract = await prisma.contract.findUnique({
            where: { id: contractId },
            select: { accountId: true },
          });
          accountId = contract?.accountId;
        } else if (programId) {
          const program = await prisma.energyProgram.findUnique({
            where: { id: programId },
            select: { accountId: true },
          });
          accountId = program?.accountId;
        }

        const created = await prisma.invoice.create({
          data: {
            tenantId: DEFAULT_TENANT_ID,
            salesforceId: invoice.Id,
            accountId,
            contractId,
            energyProgramId: programId,
            name: invoice.Name,
            invoiceName: invoice.Invoice_Name__c,
            invoiceNameTk: invoice.Invoice_Name_TK__c,
            invoiceNumber: invoice.Invoice_ID__c,
            invoiceSfNumber: invoice.Invoice_ID__c,
            itemId: invoice.Item_ID__c,
            customerId: invoice.Customerid__c,
            documentType: invoice.Document_Type__c,
            dueDate: parseDate(invoice.Due_Date__c),
            billMonth: parseDate(invoice.Bill_Month__c),
            postDate: parseDate(invoice.Post_Date__c),
            scheduledDate: parseDate(invoice.Scheduled_Date__c),
            cycleEndDate: parseDate(invoice.Cycle_End_Date__c),
            dateDelivered: parseDate(invoice.Date_Delivered__c),
            appliedPaymentDate: parseDate(invoice.Applied_Payment_Date__c),
            contractAmount: parseDecimal(invoice.Contract_Amount__c),
            invoiceTotal: parseDecimal(invoice.Invoice_Total__c),
            appliedAmount: parseDecimal(invoice.Applied_Amount__c),
            creditTotal: parseDecimal(invoice.Credit_Total__c),
            intacctStatus: invoice.Intacct_Status__c,
            intacctState: invoice.Intacct_State__c,
            billingWizard: invoice.Billing_Wizard__c || "No",
            readyForBilling: invoice.Ready_For_Billing__c || "No",
            runReconciliation: invoice.Run_Reconciliation__c || "No",
            status: invoice.Intacct_Status__c || "Draft",
          },
        });
        invoiceMap[invoice.Id] = created.id;
      } catch (error) {
        console.error(`Failed to create invoice ${invoice.Name}:`, error);
      }
    }

    console.log(`✅ Created ${Object.keys(invoiceMap).length} invoices`);

    // Step 5: Import Invoice Items
    console.log("\n📦 Importing Invoice Items...");
    const itemsFile = path.join(
      __dirname,
      "../..",
      "data",
      "Invoice_Item_CEN__c.csv"
    );
    const itemsData = fs.readFileSync(itemsFile, "utf-8");
    const items = csv.parse(itemsData, {
      columns: true,
      skip_empty_lines: true,
    }) as RawInvoiceItem[];

    let itemsCreated = 0;
    const itemMap: Record<string, string> = {}; // Salesforce ID -> Prisma ID

    for (const item of items) {
      try {
        const invoiceId = item.Invoice__c
          ? invoiceMap[item.Invoice__c]
          : undefined;
        const programId = item.Energy_Program__c
          ? programMap[item.Energy_Program__c]
          : undefined;

        if (!invoiceId) {
          console.warn(
            `Skipping invoice item ${item.Name}: Invoice not found`
          );
          continue;
        }

        const created = await prisma.invoiceItem.create({
          data: {
            tenantId: DEFAULT_TENANT_ID,
            invoiceId,
            energyProgramId: programId,
            name: item.Name,
            salesforceId: item.Id,
            invoiceItemType: item.Invoice_Item_Type__c,
            periodDate: parseDate(item.Period_Date__c),
            feeAmount: parseDecimal(item.Fee_Amount__c),
            credit: parseDecimal(item.Credit__c),
            currentCostAvoidance: parseDecimal(item.Current_Cost_Avoidance__c),
            previousCostAvoidance: parseDecimal(item.Previous_Cost_Avoidance__c),
            specialSavings: parseDecimal(item.Special_Savings__c),
            previousSpecialSavings: parseDecimal(
              item.Previous_Special_Savings__c
            ),
            currentLessPrevious: parseDecimal(item.Current_Less_Previous__c),
            savings: parseDecimal(item.Savings__c),
            d365InvoiceItemGuid: item.D365InvoiceItemGuid__c,
          },
        });
        itemMap[item.Id] = created.id;
        itemsCreated++;
      } catch (error) {
        console.error(`Failed to create invoice item ${item.Name}:`, error);
      }
    }

    console.log(`✅ Created ${itemsCreated} invoice items`);

    // Step 6: Import Reconciliation Records
    console.log("\n📦 Importing Reconciliation Records...");
    const reconFile = path.join(__dirname, "../..", "data", "recon(in).csv");
    const reconData = fs.readFileSync(reconFile, "utf-8");
    const recons = csv.parse(reconData, {
      columns: true,
      skip_empty_lines: true,
    }) as RawRecon[];

    let reconsCreated = 0;

    for (const recon of recons) {
      try {
        const itemId = recon.invoiceitemid
          ? itemMap[recon.invoiceitemid]
          : undefined;
        const programId = recon.EnergyProgram
          ? programMap[recon.EnergyProgram]
          : undefined;

        if (!itemId) {
          console.warn(
            `Skipping recon record: Invoice item not found (${recon.invoiceitemid})`
          );
          continue;
        }

        // Get invoice ID from invoice item
        const item = await prisma.invoiceItem.findUnique({
          where: { id: itemId },
          select: { invoiceId: true },
        });

        await prisma.invoiceRecon.create({
          data: {
            tenantId: DEFAULT_TENANT_ID,
            invoiceItemId: itemId,
            invoiceId: item?.invoiceId,
            orgName: recon.Orgname,
            placeInfo: recon.placeInfo,
            logicalDeviceCode: recon.logicaldevicecode,
            reportDate: parseDate(recon.ReportDate),
            beginDate: parseDate(recon.BeginDate),
            category: recon.Category,
            currentBatcc: parseDecimal(recon["Current BATCC"]),
            previousBatcc: parseDecimal(recon["Previous BATCC"]),
            currentActualCost: parseDecimal(recon["Current Actual Cost"]),
            previousActualCost: parseDecimal(recon["Previous Actual Cost"]),
            currentCa: parseDecimal(recon["Current CA"]),
            previousCa: parseDecimal(recon["Previous CA"]),
            energyProgramId: programId,
            salesDocName: recon.SalesDocName,
            placeId: recon.PlaceId,
            invoiceItemName: recon.invoiceitemname,
          },
        });
        reconsCreated++;
      } catch (error) {
        console.error(
          `Failed to create recon record for ${recon.Orgname}:`,
          error
        );
      }
    }

    console.log(`✅ Created ${reconsCreated} reconciliation records`);

    console.log("\n✨ Data import completed successfully!");
    console.log(`Summary:`);
    console.log(`  - Accounts: ${Object.keys(accountMap).length}`);
    console.log(`  - Contracts: ${Object.keys(contractMap).length}`);
    console.log(`  - Energy Programs: ${Object.keys(programMap).length}`);
    console.log(`  - Invoices: ${Object.keys(invoiceMap).length}`);
    console.log(`  - Invoice Items: ${itemsCreated}`);
    console.log(`  - Reconciliation Records: ${reconsCreated}`);
  } catch (error) {
    console.error("❌ Data import failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
