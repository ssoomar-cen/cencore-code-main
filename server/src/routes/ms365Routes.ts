import { Router, Request, Response } from "express";
import { db } from "../utils/prisma.js";
import { env } from "../config/env.js";

export const ms365Router = Router();

const VALID_ACTIONS = new Set([
  "list_emails", "send_email",
  "list_events", "create_event",
  "list_sites", "list_drives", "list_drive_items",
  "list_my_files", "list_users",
  "list_teams", "list_channels", "send_channel_message",
  "list_channel_messages", "list_chats", "send_chat_message",
  "list_contacts", "create_contact",
]);

async function verifySupabaseUser(authHeader: string): Promise<{ id: string; email: string } | null> {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  try {
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: env.SUPABASE_ANON_KEY },
    });
    if (!res.ok) return null;
    const user = await res.json() as { id: string; email?: string };
    if (!user?.id) return null;
    return { id: user.id, email: user.email ?? "" };
  } catch {
    return null;
  }
}

async function getM365AccessToken(msTenantId: string, clientId: string, clientSecret: string): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${msTenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token acquisition failed [${res.status}]: ${err.substring(0, 200)}`);
  }

  const data = await res.json() as { access_token: string };
  return data.access_token;
}

ms365Router.post("/", async (req: Request, res: Response) => {
  const authHeader = req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Verify the user's identity
  const user = await verifySupabaseUser(authHeader);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { action, params = {}, tenant_id } = req.body as {
    action: string;
    params: Record<string, unknown>;
    tenant_id: string;
  };

  if (!tenant_id) {
    return res.status(400).json({ error: "tenant_id is required" });
  }

  if (!action || !VALID_ACTIONS.has(action)) {
    return res.status(400).json({ error: "Invalid action" });
  }

  try {
    // Check user has access to this tenant (using postgres superuser — bypasses RLS)
    const accessRows = await db.query<{ has_access: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM public.tenant_members
         WHERE user_id = $1 AND tenant_id = $2 AND is_active = true
       ) AS has_access`,
      [user.id, tenant_id]
    );

    if (!accessRows[0]?.has_access) {
      return res.status(403).json({ error: "Access denied to this tenant" });
    }

    // Fetch M365 config (bypasses RLS via postgres superuser)
    const configRows = await db.query<{
      client_id: string;
      client_secret: string;
      ms_tenant_id: string;
      is_configured: boolean;
    }>(
      `SELECT client_id, client_secret, ms_tenant_id, is_configured
       FROM public.tenant_m365_config
       WHERE tenant_id = $1`,
      [tenant_id]
    );

    if (!configRows.length) {
      return res.status(404).json({ error: "Microsoft 365 not configured for this tenant" });
    }

    const config = configRows[0];

    if (!config.is_configured || !config.client_id || !config.client_secret || !config.ms_tenant_id) {
      return res.status(400).json({ error: "Microsoft 365 credentials incomplete for this tenant" });
    }

    // Get access token from Microsoft
    const token = await getM365AccessToken(config.ms_tenant_id, config.client_id, config.client_secret);
    const graphBase = "https://graph.microsoft.com/v1.0";
    let graphUrl: string;
    let method = "GET";
    let graphBody: string | undefined;

    switch (action) {
      case "list_emails": {
        if (!params.userId) throw new Error("userId required for list_emails");
        const top = Math.min(Math.max(parseInt(String(params.top)) || 25, 1), 100);
        graphUrl = `${graphBase}/users/${encodeURIComponent(String(params.userId))}/messages?$top=${top}&$orderby=receivedDateTime desc`;
        break;
      }
      case "send_email": {
        if (!params.userId) throw new Error("userId required for send_email");
        graphUrl = `${graphBase}/users/${encodeURIComponent(String(params.userId))}/sendMail`;
        method = "POST";
        graphBody = JSON.stringify({
          message: {
            subject: String(params.subject || "").slice(0, 500),
            body: { contentType: params.contentType === "HTML" ? "HTML" : "Text", content: String(params.body || "").slice(0, 50000) },
            toRecipients: ((params.to as string[]) || []).slice(0, 50).map((email) => ({
              emailAddress: { address: String(email) },
            })),
          },
        });
        break;
      }
      case "list_events": {
        if (!params.userId) throw new Error("userId required for list_events");
        const top = Math.min(Math.max(parseInt(String(params.top)) || 50, 1), 200);
        graphUrl = `${graphBase}/users/${encodeURIComponent(String(params.userId))}/events?$top=${top}&$orderby=start/dateTime`;
        break;
      }
      case "create_event": {
        if (!params.userId) throw new Error("userId required for create_event");
        graphUrl = `${graphBase}/users/${encodeURIComponent(String(params.userId))}/events`;
        method = "POST";
        graphBody = JSON.stringify({
          subject: String(params.subject || "").slice(0, 500),
          body: { contentType: "Text", content: String(params.body || "").slice(0, 10000) },
          start: { dateTime: params.startDateTime, timeZone: String(params.timeZone || "UTC").slice(0, 100) },
          end: { dateTime: params.endDateTime, timeZone: String(params.timeZone || "UTC").slice(0, 100) },
          attendees: ((params.attendees as string[]) || []).slice(0, 50).map((email) => ({
            emailAddress: { address: String(email) }, type: "required",
          })),
        });
        break;
      }
      case "list_sites": {
        graphUrl = `${graphBase}/sites?search=${encodeURIComponent(String(params.search || "*").slice(0, 200))}`;
        break;
      }
      case "list_drives": {
        if (!params.siteId) throw new Error("siteId required");
        graphUrl = `${graphBase}/sites/${encodeURIComponent(String(params.siteId))}/drives`;
        break;
      }
      case "list_drive_items": {
        if (!params.driveId) throw new Error("driveId required");
        const folderId = params.folderId || "root";
        graphUrl = `${graphBase}/drives/${encodeURIComponent(String(params.driveId))}/items/${encodeURIComponent(String(folderId))}/children`;
        break;
      }
      case "list_my_files": {
        if (!params.userId) throw new Error("userId required");
        graphUrl = `${graphBase}/users/${encodeURIComponent(String(params.userId))}/drive/root/children`;
        break;
      }
      case "list_contacts": {
        if (!params.userId) throw new Error("userId required for list_contacts");
        const top = Math.min(Math.max(parseInt(String(params.top)) || 100, 1), 500);
        graphUrl = `${graphBase}/users/${encodeURIComponent(String(params.userId))}/contacts?$top=${top}&$orderby=displayName`;
        break;
      }
      case "create_contact": {
        if (!params.userId) throw new Error("userId required for create_contact");
        graphUrl = `${graphBase}/users/${encodeURIComponent(String(params.userId))}/contacts`;
        method = "POST";
        const contactBody: Record<string, unknown> = {
          givenName: String(params.givenName || "").slice(0, 200),
          surname: String(params.surname || "").slice(0, 200),
        };
        if (params.emailAddresses) contactBody.emailAddresses = params.emailAddresses;
        if (params.businessPhones) contactBody.businessPhones = params.businessPhones;
        if (params.mobilePhone) contactBody.mobilePhone = String(params.mobilePhone).slice(0, 50);
        if (params.jobTitle) contactBody.jobTitle = String(params.jobTitle).slice(0, 200);
        if (params.companyName) contactBody.companyName = String(params.companyName).slice(0, 200);
        graphBody = JSON.stringify(contactBody);
        break;
      }
      case "list_users": {
        const top = Math.min(Math.max(parseInt(String(params.top)) || 100, 1), 200);
        graphUrl = `${graphBase}/users?$top=${top}`;
        break;
      }
      case "list_teams": {
        if (!params.userId) throw new Error("userId required for list_teams");
        graphUrl = `${graphBase}/users/${encodeURIComponent(String(params.userId))}/joinedTeams`;
        break;
      }
      case "list_channels": {
        if (!params.teamId) throw new Error("teamId required");
        graphUrl = `${graphBase}/teams/${encodeURIComponent(String(params.teamId))}/channels`;
        break;
      }
      case "send_channel_message": {
        if (!params.teamId || !params.channelId) throw new Error("teamId and channelId required");
        graphUrl = `${graphBase}/teams/${encodeURIComponent(String(params.teamId))}/channels/${encodeURIComponent(String(params.channelId))}/messages`;
        method = "POST";
        graphBody = JSON.stringify({
          body: { contentType: params.contentType === "html" ? "html" : "text", content: String(params.content || "").slice(0, 50000) },
        });
        break;
      }
      case "list_channel_messages": {
        if (!params.teamId || !params.channelId) throw new Error("teamId and channelId required");
        const top = Math.min(Math.max(parseInt(String(params.top)) || 25, 1), 50);
        graphUrl = `${graphBase}/teams/${encodeURIComponent(String(params.teamId))}/channels/${encodeURIComponent(String(params.channelId))}/messages?$top=${top}`;
        break;
      }
      case "list_chats": {
        if (!params.userId) throw new Error("userId required for list_chats");
        const top = Math.min(Math.max(parseInt(String(params.top)) || 25, 1), 50);
        graphUrl = `${graphBase}/users/${encodeURIComponent(String(params.userId))}/chats?$top=${top}`;
        break;
      }
      case "send_chat_message": {
        if (!params.chatId) throw new Error("chatId required");
        graphUrl = `${graphBase}/chats/${encodeURIComponent(String(params.chatId))}/messages`;
        method = "POST";
        graphBody = JSON.stringify({
          body: { contentType: params.contentType === "html" ? "html" : "text", content: String(params.content || "").slice(0, 50000) },
        });
        break;
      }
      default:
        return res.status(400).json({ error: "Invalid action" });
    }

    const graphRes = await fetch(graphUrl!, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: graphBody,
    });

    const responseData = await graphRes.json();

    if (!graphRes.ok) {
      return res.status(graphRes.status).json({
        error: (responseData as any)?.error?.message || "Graph API error",
        details: responseData,
      });
    }

    return res.json(responseData);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("ms365-proxy error:", message);
    return res.status(500).json({ error: message });
  }
});
