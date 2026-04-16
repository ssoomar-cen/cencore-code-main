# Account CSV Import Guide

This guide explains how to import the `Account.csv` file into your PostgreSQL database using the new import script.

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
DEFAULT_ORG_ID="org_default"  # Optional: your actual org ID
DEFAULT_TEAM_ID="team_default"  # Optional: your actual team ID
```

### 3. Run Database Migrations

```bash
npm run prisma:migrate
```

### 4. Run the Account Import

```bash
npm run import:accounts
```

## What Gets Imported

The script maps Account.csv columns to your database schema:

| CSV Column | Database Field |
|-----------|----------------|
| Id | salesforceId (unique identifier) |
| Name | name |
| Industry | industry |
| BillingState, BillingCountry | region |
| Org_Legal_Name__c | orgLegalName |
| Org_Type__c | orgType |
| BillingStreet | billingStreet |
| BillingCity | billingCity |
| BillingState | billingState |
| BillingPostalCode | billingPostalCode |
| BillingCountry | billingCountry |
| Phone | phone |
| Website | website |
| Status__c | status |
| Contract_Status__c | contractStatus |

## Features

✅ **Upsert Logic**: Updates existing accounts (by Salesforce ID) or creates new ones
✅ **Error Handling**: Continues on errors and provides a summary report
✅ **Progress Reporting**: Shows progress every 50 records
✅ **Empty Value Handling**: Null values for empty CSV cells
✅ **Validation**: Skips records without a name

## Expected Output

```
🔄 Starting Account CSV import...

📋 Using Org ID: org_default
📋 Using Team ID: team_default

📦 Found 285 accounts to import

✓ Imported 50 accounts...
✓ Imported 100 accounts...
...

============================================================
✅ Import Complete!
============================================================
✓ Imported: 285
⊘ Skipped: 0
✗ Errors: 0
============================================================
```

## Troubleshooting

### Database Connection Error
- Check `DATABASE_URL` is correct in `.env`
- Verify PostgreSQL is running
- Test connection: `psql $DATABASE_URL`

### "File not found" Error
- Ensure `data/Account.csv` exists
- Check file permissions

### Prisma Client Not Found
- Run: `npm run prisma:generate`
- Run: `npm install`

### Permission Denied
- Check database user has `INSERT` and `UPDATE` permissions on `accounts` table

## Updating Org/Team IDs

If you need to import accounts to a specific org/team, update `.env`:

```env
DEFAULT_ORG_ID="your_actual_org_id"
DEFAULT_TEAM_ID="your_actual_team_id"
```

Or pass them as environment variables:

```bash
DEFAULT_ORG_ID="org_123" DEFAULT_TEAM_ID="team_456" npm run import:accounts
```

## Advanced: Manual Execution

To run the import with custom environment:

```bash
# Linux/Mac
DATABASE_URL="..." DEFAULT_ORG_ID="org_123" npx tsx src/scripts/import-accounts.ts

# Windows PowerShell
$env:DATABASE_URL="..."; $env:DEFAULT_ORG_ID="org_123"; npx tsx src/scripts/import-accounts.ts
```

## Performance Notes

- Large files (500+ records) should take < 1 minute
- The script uses Prisma's upsert for efficient database operations
- Progress updates every 50 records

## Next Steps

After importing accounts, you can:
1. Import related data (Contracts, Invoices, Energy Programs) using similar scripts
2. Verify the data in your dashboard
3. Run data validation queries to ensure data quality
