import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AuthUser } from "../types/view.js";
import { db } from "../utils/prisma.js";

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing bearer token" });
  }

  const token = header.replace("Bearer ", "").trim();

  verifyIncomingToken(token)
    .then(async (payload) => {
      const hydrated = await hydrateUser(payload);
      req.user = hydrated;
      next();
    })
    .catch(() => {
      res.status(401).json({ message: "Invalid or expired token" });
    });
}

async function verifyIncomingToken(token: string): Promise<AuthUser> {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    if (payload?.id && payload?.email) {
      return normalizeUser(payload);
    }
  } catch {
    // fallback to Supabase verification
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error("Supabase verification is not configured");
  }

  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: env.SUPABASE_ANON_KEY,
    },
  });

  if (!response.ok) {
    throw new Error("Supabase token verification failed");
  }

  const supabaseUser = (await response.json()) as {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
  };

  const roleCandidate =
    supabaseUser.app_metadata?.role ??
    supabaseUser.user_metadata?.role ??
    "VIEWER";
  const teamCandidate =
    supabaseUser.app_metadata?.team_id ??
    supabaseUser.user_metadata?.team_id ??
    supabaseUser.user_metadata?.tenant_id ??
    "team-default";
  const orgCandidate =
    supabaseUser.app_metadata?.org_id ??
    supabaseUser.user_metadata?.org_id ??
    supabaseUser.user_metadata?.tenant_id ??
    "org-default";
  const fullName =
    (supabaseUser.user_metadata?.full_name as string | undefined) ??
    (supabaseUser.user_metadata?.name as string | undefined) ??
    supabaseUser.email?.split("@")[0] ??
    "User";

  return normalizeUser({
    id: supabaseUser.id,
    email: supabaseUser.email ?? `${supabaseUser.id}@unknown.local`,
    role: String(roleCandidate),
    teamId: String(teamCandidate),
    orgId: String(orgCandidate),
    name: fullName,
  });
}

function normalizeUser(raw: { id: string; email: string; role?: string; teamId?: string; orgId?: string; name?: string }): AuthUser {
  const roleRaw = String(raw.role ?? "VIEWER").toUpperCase();
  const role: AuthUser["role"] =
    roleRaw === "ADMIN" ? "ADMIN" :
    roleRaw === "MANAGER" ? "MANAGER" :
    "VIEWER";

  return {
    id: raw.id,
    email: raw.email,
    role,
    teamId: raw.teamId ?? "team-default",
    orgId: raw.orgId ?? "org-default",
    name: raw.name ?? raw.email.split("@")[0],
  };
}

async function hydrateUser(user: AuthUser): Promise<AuthUser> {
  try {
    await db.execute(
      `INSERT INTO users (id, name, email, role, "teamId", "orgId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, email = EXCLUDED.email, role = EXCLUDED.role,
         "teamId" = EXCLUDED."teamId", "orgId" = EXCLUDED."orgId", "updatedAt" = NOW()`,
      [user.id, user.name ?? user.email.split("@")[0], user.email, user.role, user.teamId, user.orgId]
    );
  } catch {
    // upsert failure must not block the request
  }
  return user;
}
