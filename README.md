# Cencore List/View Builder

This repository now includes a full-stack **List/View Builder** implementation for configurable cross-table list views with joins, filters, grouping, summaries, computed fields, saved views, RBAC, and CSV/XLSX exports.

## Implemented Deliverables

- Frontend route: `/views/:entity` and `/crm/views/:entity`
- Reusable components:
  - `src/features/views/components/ViewBuilder.tsx`
  - `src/features/views/components/DataGrid.tsx`
- Backend service: `server/` (Express + Prisma + PostgreSQL)
- Query API with safe server-side path resolution and parameterized SQL
- Saved views CRUD + favorites + sharing scopes (private/team/org)
- CSV/XLSX export endpoints with metadata
- Audit logging for view CRUD and exports
- RBAC and row-level enforcement in query builder
- OpenAPI JSON docs: `GET /docs/openapi.json`
- Seed data + sample saved views:
  - Closing This Quarter
  - Accounts by Industry
  - Product Pipeline

## Directory Structure

```text
server/
  prisma/
    schema.prisma
    seed.ts
  src/
    config/env.ts
    docs/openapi.json
    middleware/{auth,rbac,rateLimit}.ts
    routes/{queryRoutes,savedViewRoutes,exportRoutes}.ts
    services/{entityMetadata,queryBuilder,viewService,exportService,auditService,validation}.ts
    utils/prisma.ts
    index.ts
  tests/
    unit/queryBuilder.test.ts
    integration/savedViewsPermissions.test.ts
src/features/views/
  api/viewBuilderApi.ts
  hooks/useViewBuilder.ts
  components/{ViewBuilder,DataGrid}.tsx
  types/viewBuilder.ts
  utils/useDebounce.ts
src/pages/ViewBuilderPage.tsx
tests/e2e/view-builder.spec.ts
```

## Setup

### 1. Install frontend dependencies

```bash
npm i
```

### 2. Install backend dependencies

```bash
npm --prefix server i
```

### 3. Configure backend env

```bash
copy server/.env.example server/.env
```

Update `server/.env` values for PostgreSQL and JWT.
If you want automatic login passthrough from Supabase sessions, set:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

### 4. Generate Prisma client + migrate + seed

```bash
npm --prefix server run prisma:generate
npm --prefix server run prisma:migrate
npm --prefix server run prisma:seed
```

### 5. Run app (single server)

Build once:
```bash
npm run one:build
```

Start fast (no rebuild on every run):
```bash
npm run dev:one
```

Single app URL (frontend + API): `http://localhost:4000`
(`dev:one` is now the stable single-server run and does not use watch mode.)

Production-style single command (build + run one server):
```bash
npm run start:one
```

Optional split mode for developers:
- `npm run dev` (frontend on 8080)
- `npm run dev:server` (API on 4000)

## Local + Cloudflare + Supabase (Required Configuration)

Use one Supabase project for both environments.

1. Local environment (`.env` in repo root):
```bash
VITE_SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
VITE_VIEW_SERVER="false"
VITE_VIEW_API_URL=""
VITE_ENABLE_DEV_TOKEN="false"
```

2. Cloudflare environment variables (Pages project settings):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_VIEW_SERVER` = `false`
- `VITE_VIEW_API_URL` = empty
- `VITE_ENABLE_DEV_TOKEN` = `false`

3. Supabase Auth URL allowlist (Supabase Dashboard -> Authentication -> URL Configuration):
- Site URL: `https://cencoredev.mnsdynamics.com`
- Additional Redirect URLs:
  - `http://localhost:4000/*`
  - `https://cencoredev.mnsdynamics.com/*`

4. Deploy behavior:
- Local: run `npm run dev:one` to serve app at `http://localhost:4000`
- Cloudflare: connect the GitHub repo (`cencore-code`) to Cloudflare Pages so each push to your deployment branch triggers a new deploy automatically.

## API Summary

### Query execution
`POST /api/views/query`

Example payload:

```json
{
  "baseEntity": "opportunities",
  "columns": [
    { "id": "name", "path": "name" },
    { "id": "account_name", "path": "account.name", "label": "Account" },
    { "id": "amount", "path": "amount", "aggregation": "sum" }
  ],
  "filters": {
    "op": "and",
    "filters": [
      { "path": "stage", "op": "eq", "value": "Proposal" },
      { "path": "close_date", "op": "dateRange", "value": ["2026-04-01", "2026-06-30"] }
    ]
  },
  "sorts": [{ "path": "close_date", "dir": "asc" }],
  "groupBy": ["stage"],
  "computed": [{ "id": "weighted", "label": "Weighted", "expression": "amount * probability" }],
  "pagination": { "page": 1, "pageSize": 50 },
  "totals": true
}
```

### Saved view CRUD
- `GET /api/views/saved?baseEntity=opportunities`
- `POST /api/views/saved`
- `GET /api/views/saved/:id`
- `PUT /api/views/saved/:id`
- `DELETE /api/views/saved/:id`
- `POST /api/views/saved/:id/star`

### Export
- `POST /api/views/export/csv`
- `POST /api/views/export/xlsx`

## Auth + RBAC

The frontend automatically uses the current logged-in Supabase session token.
No manual token step is required for users.

For local debugging only, a helper endpoint still exists:
- `GET /auth/dev-token?role=ADMIN|MANAGER|VIEWER`

Role behavior:
- `ADMIN`: org-wide read/manage (including org-scoped views)
- `MANAGER`: team-scoped read; owner-only manage
- `VIEWER`: owner/team restricted row access, read-only unless owner of view

## Security Controls Implemented

- Parameterized query values (no user string interpolation for values)
- Path allowlist from server metadata
- Role-based field access checks
- Query cost guardrails:
  - max joins
  - max path depth (`2`)
  - page-size limits
- Statement timeout guard (`QUERY_TIMEOUT_MS`)
- Formula validation for supported syntax/functions only
- Export endpoint rate-limiting
- Audit log entries for saved view mutations and exports

## Performance Notes

- Server-side pagination/filtering/sorting/grouping
- Virtualized grid rendering on frontend (`@tanstack/react-virtual`)
- Cached metadata and views via React Query
- Debounced query requests and optional Apply mode
- ETag support on saved-view list endpoint

## PostgreSQL Index Recommendations

Already included by schema where applicable.

Add/verify in production:
- `opportunities(stage)`
- `opportunities(close_date)`
- `opportunities(account_id)`
- `opportunities(owner_id)`
- `opportunities(stage, close_date)`
- `contacts(account_id)`
- `opportunity_products(opportunity_id, product_id)`
- `saved_views(base_entity, scope, team_id, org_id)`
- partial index example for open pipeline:
  - `CREATE INDEX idx_opp_open_stage ON opportunities(stage) WHERE stage NOT IN ('Closed Won', 'Closed Lost');`

## Testing

Backend:
```bash
npm --prefix server run test
```

E2E scaffold:
```bash
npx playwright test
```

## Notes

- Existing CRM pages remain intact.
- New list builder is additive and accessed via `/views/:entity`.
- The server is isolated under `server/` to avoid disrupting existing Supabase-based modules.
