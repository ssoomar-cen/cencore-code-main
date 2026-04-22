import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, "..");

const schemaPath = path.join(serverRoot, "db", "schema.sql");
const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/cencore";

function databaseNameFrom(url) {
  const parsed = new URL(url);
  const name = parsed.pathname.replace(/^\//, "");
  if (!name) throw new Error("DATABASE_URL must include a database name");
  return name;
}

function adminUrlFrom(url) {
  if (process.env.DATABASE_ADMIN_URL) return process.env.DATABASE_ADMIN_URL;
  const parsed = new URL(url);
  parsed.pathname = "/postgres";
  parsed.search = "";
  return parsed.toString();
}

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function ensureDatabase() {
  const dbName = databaseNameFrom(databaseUrl);
  const adminPool = new Pool({ connectionString: adminUrlFrom(databaseUrl) });

  try {
    const existing = await adminPool.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (existing.rowCount === 0) {
      await adminPool.query(`CREATE DATABASE ${quoteIdentifier(dbName)}`);
      console.log(`Created database ${dbName}`);
    } else {
      console.log(`Database ${dbName} already exists`);
    }
  } finally {
    await adminPool.end();
  }
}

async function applySchema() {
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  const appPool = new Pool({ connectionString: databaseUrl });

  try {
    await appPool.query(schemaSql);
    const result = await appPool.query(
      "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public'",
    );
    console.log(`Applied schema (${result.rows[0].count} public tables present)`);
  } finally {
    await appPool.end();
  }
}

await ensureDatabase();
await applySchema();
