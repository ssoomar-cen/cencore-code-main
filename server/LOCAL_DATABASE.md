# Local PostgreSQL database setup

This app uses a local PostgreSQL database through `server/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cencore"
```

On another machine, set `DATABASE_URL` to the target app database. If that database does not exist yet, also set `DATABASE_ADMIN_URL` to an admin database on the same server, usually the `postgres` database:

```env
DATABASE_ADMIN_URL="postgresql://postgres:postgres@localhost:5432/postgres"
```

Run the repeatable setup from the repo root:

```powershell
npm --prefix server run db:setup
```

To load the CSV data files from `data/` after the schema exists:

```powershell
npm --prefix server run db:import
```

The setup script is idempotent: it creates the database if needed, applies `server/db/schema.sql`, and can be rerun without dropping data.
