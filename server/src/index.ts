import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import jwt from "jsonwebtoken";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { requireAuth } from "./middleware/auth.js";
import { exportRateLimit } from "./middleware/rateLimit.js";
import { exportRouter } from "./routes/exportRoutes.js";
import { queryRouter } from "./routes/queryRoutes.js";
import { savedViewsRouter } from "./routes/savedViewRoutes.js";
import { ms365Router } from "./routes/ms365Routes.js";
import { invoiceRouter, invoiceListRouter } from "./routes/invoiceRoutes.js";
import accountRoutes from "./routes/accountRoutes.js";
import { importRouter } from "./routes/importRoutes.js";
import { contractRouter } from "./routes/contractRoutes.js";
import { energyProgramRouter } from "./routes/energyProgramRoutes.js";
import { salesforceRouter } from "./routes/salesforceRoutes.js";
import { integrationRouter } from "./routes/integrationRoutes.js";
import { searchRouter } from "./routes/searchRoutes.js";
import { buildingRouter } from "./routes/buildingRoutes.js";
import { contactRouter } from "./routes/contactRoutes.js";
import { activityRouter } from "./routes/activityRoutes.js";
import { dashboardRouter } from "./routes/dashboardRoutes.js";
import { opportunityRouter } from "./routes/opportunityRoutes.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const supabaseOrigin = env.SUPABASE_URL ? new URL(env.SUPABASE_URL).origin : undefined;

function findFrontendRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 6; i += 1) {
    if (fs.existsSync(path.join(dir, "index.html")) && fs.existsSync(path.join(dir, "src"))) {
      return dir;
    }
    const next = path.dirname(dir);
    if (next === dir) break;
    dir = next;
  }
  return process.cwd();
}

const frontendRoot = findFrontendRoot(__dirname);
const serveFrontend = String(process.env.SERVE_FRONTEND ?? "true").toLowerCase() === "true";

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use((_, res, next) => {
  const connectTargets = [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    ...(supabaseOrigin ? [supabaseOrigin] : []),
  ];

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "img-src 'self' data: blob: https://storage.googleapis.com https://*.googleusercontent.com https://*.supabase.co",
    `connect-src ${connectTargets.join(" ")}`,
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
  ].join("; ");

  res.setHeader("Content-Security-Policy", csp);
  next();
});
app.use(compression());
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ ok: true, at: new Date().toISOString() });
});

app.get("/docs/openapi.json", (_req, res) => {
  const filePath = path.join(__dirname, "docs", "openapi.json");
  const body = fs.readFileSync(filePath, "utf-8");
  res.type("application/json").send(body);
});

app.get("/auth/dev-token", (req, res) => {
  const role = String(req.query.role ?? "ADMIN") as "ADMIN" | "MANAGER" | "VIEWER";
  const payload = {
    id: String(req.query.userId ?? "dev-user"),
    role,
    teamId: String(req.query.teamId ?? "team-alpha"),
    orgId: String(req.query.orgId ?? "org-cencore"),
    email: `${role.toLowerCase()}@cencore.local`,
    name: role,
  };
  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: "1d" });
  res.json({ token, user: payload });
});

app.use("/api/views", requireAuth, queryRouter);
app.use("/api/views/saved", requireAuth, savedViewsRouter);
app.use("/api/views/export", requireAuth, exportRateLimit, exportRouter);
app.use("/api/invoices", invoiceListRouter);
app.use("/api/invoices", requireAuth, invoiceRouter);
app.use("/api/accounts", accountRoutes);
app.use("/api/contracts", contractRouter);
app.use("/api/energy-programs", energyProgramRouter);
app.use("/api/import", importRouter);
app.use("/api/ms365", ms365Router);
app.use("/api/salesforce", salesforceRouter);
app.use("/api/integrations", integrationRouter);
app.use("/api/search", searchRouter);
app.use("/api/buildings", buildingRouter);
app.use("/api/contacts", contactRouter);
app.use("/api/activities", activityRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/opportunities", opportunityRouter);

async function attachFrontend() {
  if (!serveFrontend) {
    return;
  }

  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    const { createServer } = await import("vite");
    const vite = await createServer({
      configFile: path.join(frontendRoot, "vite.config.ts"),
      root: frontendRoot,
      server: { middlewareMode: true },
      appType: "custom",
    });

    app.use(vite.middlewares);

    app.use("*", async (req, res, next) => {
      if (req.originalUrl.startsWith("/api/") || req.originalUrl.startsWith("/auth/") || req.originalUrl.startsWith("/docs/")) {
        return next();
      }

      try {
        const htmlPath = path.join(frontendRoot, "index.html");
        const template = fs.readFileSync(htmlPath, "utf-8");
        const transformed = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(transformed);
      } catch (error) {
        vite.ssrFixStacktrace(error as Error);
        next(error);
      }
    });

    return;
  }

  const distDir = path.join(frontendRoot, "dist");
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get("*", (req, res, next) => {
      if (req.originalUrl.startsWith("/api/") || req.originalUrl.startsWith("/auth/") || req.originalUrl.startsWith("/docs/")) {
        return next();
      }
      return res.sendFile(path.join(distDir, "index.html"));
    });
  }
}

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  res.status(400).json({ message });
});

attachFrontend().then(() => {
  app.listen(env.PORT, () => {
    console.log(`Cencore app running on http://localhost:${env.PORT}`);
  });
});
