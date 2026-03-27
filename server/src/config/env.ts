import dotenv from "dotenv";
import { z } from "zod";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, "..", "..");

const envCandidates = [
  path.join(serverRoot, ".env"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "server", ".env"),
];

for (const candidate of envCandidates) {
  if (path.basename(candidate) === ".env") {
    dotenv.config({ path: candidate });
  }
}

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(8),
  QUERY_TIMEOUT_MS: z.coerce.number().default(15000),
  MAX_EXPORT_ROWS: z.coerce.number().default(100000),
  EXPORT_RATE_LIMIT_PER_MINUTE: z.coerce.number().default(10),
  SUPABASE_URL: z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional()),
  SUPABASE_ANON_KEY: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
});

export const env = schema.parse(process.env);
