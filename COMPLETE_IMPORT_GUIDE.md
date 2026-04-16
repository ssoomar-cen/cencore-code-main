# Complete Data Import Guide

This guide explains how to import all Salesforce CSV files into your PostgreSQL database using the import scripts.

## Prerequisites

1. **Database Setup**: Ensure PostgreSQL is running and your `DATABASE_URL` is configured
2. **Prisma Migrations**: Run `npm run prisma:migrate` to apply all migrations
3. **Dependencies**: Run `npm install` to install all required packages

## Setup Steps

### 1. Install Dependencies (if not already done)

```bash
cd server
npm install
```

### 2. Configure Environment Variables

Ensure your `.env` file in the `server/` directory has:

```env
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/cencore_views?schema=public"
DEFAULT_TENANT_ID="default"  # Optional: your actual tenant ID
```

### 3. Run Database Migrations

```bash
npm run prisma:migrate
```

## Import Scripts Overview

### Individual Import Scripts

Each CSV file has a dedicated import script with the following pattern:

#### Accounts (Required First)
```bash
npm run import:accounts
```
**What it does:**
- Imports Account.csv data
- Maps Salesforce account fields to the database
- Creates base records for the data hierarchy

#### Contracts (After Accounts)
```bash
npm run import:contracts
```
**What it does:**
- Imports Contract_CEN__c.csv data
- Links contracts to accounts via Salesforce ID
- Maps contract-specific fields (status, type, dates, manager)

#### Energy Programs (After Accounts)
```bash
npm run import:energy-programs
```
**What it does:**
- Imports Energy_Program__c.csv data
- Links programs to accounts via Salesforce ID
- Maps program-specific fields (status, technical leads)

#### Invoices (After Accounts, Contracts, and Energy Programs)
```bash
npm run import:invoices
```
**What it does:**
- Imports Invoice_CEN__c.csv data
- Links invoices to accounts, contracts, and energy programs
- Maps financial and status fields
- Creates invoice records with proper relationships

#### Invoice Items (After Invoices)
```bash
npm run import:invoice-items
```
**What it does:**
- Imports Invoice_Item_CEN__c.csv data
- Links items to invoices and energy programs
- Maps financial metrics (savings, cost avoidance, fees)
- Supports decimal precision for financial calculations

#### Reconciliation (After Invoice Items)
```bash
npm run import:reconciliation
```
**What it does:**
- Imports recon(in).csv data
- Links records to invoice items
- Maps location and financial reconciliation data
- Provides granular data for verification

### Batch Import

Import all data in the correct order:

```bash
npm run import:all
```

This runs all imports sequentially:
1. Accounts
2. Contracts
3. Energy Programs
4. Invoices
5. Invoice Items
6. Reconciliation

## CSV File Mappings

### Account.csv
| CSV Column | Database Field |
|-----------|----------------|
| Id | salesforce_id |
| Name | name |
| Industry | industry |
| BillingState, BillingCountry | region |
| Org_Legal_Name__c | org_legal_name |
| Contract_Status__c | contract_status |

### Contract_CEN__c.csv
| CSV Column | Database Field |
|-----------|----------------|
| Id | salesforce_id |
| Name | name |
| Organization__c | account_id (via lookup) |
| Contract_Status__c | contract_status |
| Contract_Type__c | contract_type |
| Contract_Start_Date__c | contract_start_date |
| Client_Manager__c | client_manager |

### Energy_Program__c.csv
| CSV Column | Database Field |
|-----------|----------------|
| Id | salesforce_id |
| Name | name |
| Organization__c | account_id (via lookup) |
| Status__c | status |
| pgmId__c | pgm_id |
| Technical_Lead__c | technical_lead |
| Implementation_Consultant__c | implementation_consultant |

### Invoice_CEN__c.csv
| CSV Column | Database Field |
|-----------|----------------|
| Id | salesforce_id |
| Name | name |
| Invoice_ID__c | invoice_sf_number |
| Contract__c | contract_id (via lookup) |
| Energy_Program__c | energy_program_id (via lookup) |
| Invoice_Total__c | invoice_total |
| Due_Date__c | due_date |
| Intacct_Status__c | intacct_status |

### Invoice_Item_CEN__c.csv
| CSV Column | Database Field |
|-----------|----------------|
| Id | salesforce_id |
| Name | name |
| Invoice__c | invoice_id (via lookup) |
| Energy_Program__c | energy_program_id (via lookup) |
| Period_Date__c | period_date |
| Current_Cost_Avoidance__c | current_cost_avoidance |
| Fee_Amount__c | fee_amount |
| D365InvoiceItemGuid__c | d365_invoice_item_guid (unique) |

### recon(in).csv
| CSV Column | Database Field |
|-----------|----------------|
| invoiceitemid | invoice_item_id (via lookup) |
| EnergyProgram | energy_program_id (via lookup) |
| ReportDate | report_date |
| Current BATCC | current_batcc |
| Current Actual Cost | current_actual_cost |
| Current CA | current_ca |

## Features

✅ **Upsert Logic**: Updates existing records (by Salesforce ID) or creates new ones
✅ **Error Handling**: Continues on errors and provides a summary report
✅ **Progress Reporting**: Shows progress every 50 records
✅ **Empty Value Handling**: Null values for empty CSV cells
✅ **Referential Integrity**: Maintains foreign key relationships
✅ **Decimal Precision**: Handles financial calculations with proper precision
✅ **Date Parsing**: Converts Salesforce date strings to ISO 8601 format

## Expected Output

Example output from a successful import:

```
🔄 Starting Contract CSV import...

📋 Using Tenant ID: default

📦 Found 285 contracts to import

✓ Imported 50 contracts...
✓ Imported 100 contracts...
...

============================================================
✅ Import Complete!
============================================================
✓ Imported: 285
⊘ Skipped: 0
✗ Errors: 0
============================================================
```

## Import Order (Important!)

Always import in this order to maintain referential integrity:

1. **Accounts** - Base records for the hierarchy
2. **Contracts** - References accounts
3. **Energy Programs** - References accounts
4. **Invoices** - References accounts, contracts, and energy programs
5. **Invoice Items** - References invoices and energy programs
6. **Reconciliation** - References invoice items and energy programs

The `npm run import:all` script handles this automatically.

## Troubleshooting

### Database Connection Error
- Check `DATABASE_URL` is correct in `.env`
- Verify PostgreSQL is running
- Test connection: `psql $DATABASE_URL`

### Salesforce ID Not Found
- Ensure parent records (accounts, contracts) are imported first
- Check CSV files have matching Salesforce IDs
- Verify parent records were imported successfully

### File Not Found Error
- Ensure CSV files are in `/data` directory:
  - Account.csv
  - Contract_CEN__c.csv
  - Energy_Program__c.csv
  - Invoice_CEN__c.csv
  - Invoice_Item_CEN__c.csv
  - recon(in).csv

### Duplicate Key Errors
- Most errors are handled gracefully with upsert logic
- If conflicts persist, check for data integrity issues in source CSV

### Permission Denied
- Ensure database user has INSERT, UPDATE, SELECT permissions
- Try resetting migrations: `npx prisma migrate reset`

## Performance Notes

- Import times depend on record count and database performance
- Typical speeds: 100-500 records/second
- For large datasets (100k+), consider:
  - Running during off-peak hours
  - Increasing connection pool size
  - Adjusting batch sizes (modify import scripts)

## Additional Commands

### View Import Progress in Real-time
```bash
# Terminal 1: Start the import
npm run import:contracts

# Terminal 2: Monitor database
psql $DATABASE_URL
SELECT COUNT(*) FROM contract;
```

### Reset Data (Careful!)
```bash
# Delete all data (respects foreign key constraints)
npx prisma migrate reset
```

### Validate Data After Import
```bash
npx prisma studio
```
This opens an interactive database browser to verify imported data.

## Next Steps

After successful import:
1. Run API server: `npm run dev`
2. Test endpoints at `http://localhost:3000/api/accounts`
3. Check frontend UI for data display
4. Validate referential data display across drill-down hierarchy
