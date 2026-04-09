# Account Drill-Down Implementation - Complete Setup Guide

## ✅ Completed Tasks

### 1. **Database Schema Updates** ✓
- Updated Prisma schema with three new models:
  - `Contract`: Links to Account, stores contract-specific data (status, dates, manager)
  - `EnergyProgram`: Links to Account, stores energy program data (status, technical leads)
  - Updated `Invoice` model with proper relationships to Account, Contract, and EnergyProgram
- File: [server/prisma/schema.prisma](../server/prisma/schema.prisma)

### 2. **Data Import/Seed Script** ✓
- Created comprehensive Prisma seed script with CSV parsing
- Handles all 6 CSV files from Salesforce:
  - **Account.csv** → `Account` records
  - **Contract_CEN__c.csv** → `Contract` records
  - **Energy_Program__c.csv** → `EnergyProgram` records
  - **Invoice_CEN__c.csv** → `Invoice` records
  - **Invoice_Item_CEN__c.csv** → `InvoiceItem` records
  - **recon(in).csv** → `InvoiceRecon` records
- Features:
  - Proper Salesforce ID mapping (sfId → Prisma ID)
  - Maintains referential integrity across tables
  - Automatic account resolution from contract/program relationships
  - Soft error handling (skips records with missing references)
- File: [server/prisma/seed.ts](../server/prisma/seed.ts)
- Dependencies: Added `csv-parse` package

### 3. **Backend API Routes** ✓
- Created comprehensive REST API for account drill-down hierarchy
- **Account Endpoints:**
  - `GET /api/accounts` - List all accounts with search/filtering
  - `GET /api/accounts/:accountId` - Account details with related contracts/programs
  - `GET /api/accounts/:accountId/contracts` - Account's contracts
  - `GET /api/accounts/:accountId/energy-programs` - Account's energy programs
  - `GET /api/accounts/:accountId/invoices` - Account's invoices
- **Contract Endpoints:**
  - `GET /api/accounts/contracts/:contractId` - Contract details
  - `GET /api/accounts/contracts/:contractId/invoices` - Contract's invoices
- **Energy Program Endpoints:**
  - `GET /api/accounts/programs/:programId` - Program details
  - `GET /api/accounts/programs/:programId/invoices` - Program's invoices
- File: [server/src/routes/accountRoutes.ts](../server/src/routes/accountRoutes.ts)
- All routes require authentication with `requireAuth` middleware
- Supports pagination with `limit` and `offset` query parameters

### 4. **Frontend React Hooks** ✓
- Created custom React Query hooks for all API endpoints
- **Account Hooks:**
  - `useAccounts()` - List accounts with search
  - `useAccount()` - Fetch single account with suspense
  - `useAccountWithData()` - Fetch account without suspense
- **Contract Hooks:**
  - `useAccountContracts()` - List contracts for account
  - `useContract()` - Fetch contract details
  - `useContractInvoices()` - List contract's invoices
- **Energy Program Hooks:**
  - `useAccountEnergyPrograms()` - List programs for account
  - `useEnergyProgram()` - Fetch program details
  - `useEnergyProgramInvoices()` - List program's invoices
- **Invoice Hooks:**
  - `useAccountInvoices()` - List account's invoices
- File: [src/hooks/useAccountData.ts](../src/hooks/useAccountData.ts)
- Uses React Query for caching and state management

### 5. **Frontend React Components** ✓
- **AccountsPage.tsx**: Main accounts list page with:
  - Search/filtering functionality
  - Pagination (50 items per page)
  - Account counts (contracts, programs, invoices)
  - Navigate to account details
  - File: [src/components/crm/AccountsPage.tsx](../src/components/crm/AccountsPage.tsx)

- **AccountDetailPage.tsx**: Account detail page with 4 tabs:
  - **Overview Tab**: Account information, billing address, status
  - **Contracts Tab**: Drillable table of contracts with invoice counts
  - **Energy Programs Tab**: Drillable table of programs with invoice counts
  - **Invoices Tab**: Invoices linked to account directly
  - Click-through navigation to contract/program/invoice detail pages
  - File: [src/components/crm/AccountDetailPage.tsx](../src/components/crm/AccountDetailPage.tsx)

### 6. **Routing Integration** ✓
- Registered new API routes in server
- File: [server/src/index.ts](../server/src/index.ts)
- Routes added: `app.use("/api/accounts", requireAuth, accountRoutes)`

## 🔧 Next Steps - When Database Connection is Restored

### Step 1: Restore Database Connection
The Supabase database connection is currently unreachable. Once connection is restored:

```bash
# Test connection
cd server
npx prisma db push
```

### Step 2: Run Database Migrations
```bash
cd server
npx prisma migrate dev --name add-contract-and-energy-program
```

### Step 3: Run Data Import Seed Script
```bash
cd server
npx prisma db seed
```
This will:
- Create 4 transactions (one per CSV type group)
- Import all Account records
- Import all Contract records linked to Accounts
- Import all EnergyProgram records linked to Accounts
- Import all Invoice records linked to Accounts/Contracts/Programs
- Import all InvoiceItem records
- Import all InvoiceRecon records with device-level data

Expected output:
```
✨ Data import completed successfully!
Summary:
  - Accounts: ~1000+
  - Contracts: ~500+
  - Energy Programs: ~200+
  - Invoices: ~5000+
  - Invoice Items: ~10000+
  - Reconciliation Records: ~50000+
```

## 🎯 Testing the Drill-Down with Specific Accounts

After data import, verify accounts are loaded:

```bash
# Option 1: Use API directly
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:4000/api/accounts?search=fresno"

curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:4000/api/accounts?search=alpine"

curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:4000/api/accounts?search=dallas"

# Option 2: Use the UI
1. Navigate to /accounts
2. Search for "Fresno", "Alpine", or "Dallas Morning News"
3. Click "View" to open account detail page
4. Switch between tabs to see contracts, programs, and invoices
5. Click on a contract or program to view its invoices
6. Click on an invoice to see line items and reconciliation data
```

## 📊 Complete Data Flow

```
AccountsPage (List)
    ↓
AccountDetailPage (Details + Tabs)
    ├── Contracts Tab (click to navigate)
    │   └── ContractDetailPage (if created)
    │       └── Contract's Invoices
    │
    ├── Energy Programs Tab (click to navigate)
    │   └── EnergyProgramDetailPage (if created)
    │       └── Program's Invoices
    │
    └── Invoices Tab (click to navigate)
        └── InvoiceDetailPage (existing)
            ├── InvoiceItemsTab
            └── InvoiceReconTab

Full drill-down: Account → Contract/Program → Invoice → Item → Recon Device
```

## 🛠️ Running the Application

### Prerequisites
```bash
# Install dependencies (if not already done)
npm install
npm install csv-parse
```

### Start Development Server
```bash
# Terminal 1: Frontend (Vite)
npm run dev
# Serves on http://localhost:8080

# Terminal 2: Backend (Express)
cd server
npm run dev
# Serves on http://localhost:4000
```

### Get Auth Token
For testing, get a dev token:
```bash
curl "http://localhost:4000/auth/dev-token?role=ADMIN"
```

## 📁 Files Modified/Created

### Backend (server/)
- ✓ `prisma/schema.prisma` - Added Contract, EnergyProgram models
- ✓ `prisma/seed.ts` - Data import script
- ✓ `src/routes/accountRoutes.ts` - Account/Contract/Program API routes
- ✓ `src/index.ts` - Registered new routes

### Frontend (src/)
- ✓ `hooks/useAccountData.ts` - React Query hooks
- ✓ `components/crm/AccountsPage.tsx` - Accounts list page
- ✓ `components/crm/AccountDetailPage.tsx` - Account detail page with tabs

## 🚀 Optional Enhancements

### Contract Detail Page (Not Yet Created)
```typescript
// src/components/crm/ContractDetailPage.tsx
- Display contract specifics
- Show related energy programs
- List all invoices with drilldown to items
```

### Energy Program Detail Page (Not Yet Created)
```typescript
// src/components/crm/EnergyProgramDetailPage.tsx
- Display program details and technicalleads
- Show related invoices
- Map reconciliation records by location
```

### Additional Features (Future)
- [ ] Export account data to CSV
- [ ] Create invoice summary reports by account
- [ ] Add cost analysis dashboard
- [ ] Implement bulk operations
- [ ] Add timeline view for contract dates
- [ ] Create alerts for due invoices

## 🐛 Troubleshooting

### Database Connection Failed
**Error**: `Can't reach database server at db.ddubqqumbzbnkfliuwpd.supabase.co:5432`
**Solution**: 
- Check internet connectivity
- Verify Supabase project is active
- Check `.env` DATABASE_URL is correct

### Import Errors
**Error**: `Skipping contract: Account not found`
**Cause**: Account record doesn't exist in Organization__c field
**Solution**: This is expected - records with missing references are skipped for data integrity

### Auth Required
**Error**: `401 Unauthorized` on API calls
**Solution**: 
- Include Authorization header with valid JWT token
- Get dev token from `/auth/dev-token` endpoint
- Check token is not expired

## 📞 Support

For issues or questions:
1. Check error messages in browser console and server logs
2. Verify database connectivity
3. Review Prisma schema for relationship issues
4. Check API route handler for edge cases

---

**Status**: Ready for data import once DB connection is restored  
**Last Updated**: 2024  
**Data Sources**: 6 Salesforce CSV exports  
**Storage**: PostgreSQL via Prisma ORM
