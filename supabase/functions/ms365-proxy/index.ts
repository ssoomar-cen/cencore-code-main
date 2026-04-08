import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

const VALID_ACTIONS = new Set([
  "list_emails", "send_email",
  "list_events", "create_event",
  "list_sites", "list_drives", "list_drive_items",
  "list_my_files", "list_users",
  "list_teams", "list_channels", "send_channel_message",
  "list_channel_messages", "list_chats", "send_chat_message",
  "list_contacts", "create_contact",
]);

async function getAccessToken(tenantId: string, clientId: string, clientSecret: string): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
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
    throw new Error(`Token acquisition failed [${res.status}]: ${err}`);
  }

  const data: TokenResponse = await res.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate the JWT and get the caller's identity
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: userError } = await callerClient.auth.getUser();
    if (userError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, params, tenant_id } = await req.json();

    if (!tenant_id || typeof tenant_id !== "string") {
      return new Response(JSON.stringify({ error: "tenant_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!action || !VALID_ACTIONS.has(action)) {
      return new Response(JSON.stringify({ error: `Invalid action` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the caller has access to the requested tenant
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: accessCheck } = await adminClient.rpc("user_has_tenant_access", {
      _user_id: caller.id,
      _tenant_id: tenant_id,
    });

    if (!accessCheck) {
      return new Response(JSON.stringify({ error: "Access denied to this tenant" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch per-tenant M365 config using service role (bypasses RLS)
    const { data: m365Config, error: configError } = await adminClient
      .from("tenant_m365_config")
      .select("client_id, client_secret, ms_tenant_id, is_configured")
      .eq("tenant_id", tenant_id)
      .single();

    if (configError || !m365Config) {
      return new Response(JSON.stringify({ error: "Microsoft 365 not configured for this tenant" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!m365Config.is_configured || !m365Config.client_id || !m365Config.client_secret || !m365Config.ms_tenant_id) {
      return new Response(JSON.stringify({ error: "Microsoft 365 credentials incomplete for this tenant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await getAccessToken(m365Config.ms_tenant_id, m365Config.client_id, m365Config.client_secret);
    const graphBase = "https://graph.microsoft.com/v1.0";
    let graphUrl: string;
    let method = "GET";
    let graphBody: string | undefined;

    switch (action) {
      // ── Email ──
      case "list_emails": {
        const userId = params?.userId;
        if (!userId) throw new Error("userId required for list_emails");
        const top = Math.min(Math.max(parseInt(params?.top) || 25, 1), 100);
        graphUrl = `${graphBase}/users/${encodeURIComponent(userId)}/messages?$top=${top}&$orderby=receivedDateTime desc`;
        break;
      }
      case "send_email": {
        const userId = params?.userId;
        if (!userId) throw new Error("userId required for send_email");
        graphUrl = `${graphBase}/users/${encodeURIComponent(userId)}/sendMail`;
        method = "POST";
        graphBody = JSON.stringify({
          message: {
            subject: String(params.subject || "").slice(0, 500),
            body: { contentType: params.contentType === "HTML" ? "HTML" : "Text", content: String(params.body || "").slice(0, 50000) },
            toRecipients: (params.to || []).slice(0, 50).map((email: string) => ({
              emailAddress: { address: String(email) },
            })),
          },
        });
        break;
      }

      // ── Calendar ──
      case "list_events": {
        const userId = params?.userId;
        if (!userId) throw new Error("userId required for list_events");
        const top = Math.min(Math.max(parseInt(params?.top) || 50, 1), 200);
        graphUrl = `${graphBase}/users/${encodeURIComponent(userId)}/events?$top=${top}&$orderby=start/dateTime`;
        break;
      }
      case "create_event": {
        const userId = params?.userId;
        if (!userId) throw new Error("userId required for create_event");
        graphUrl = `${graphBase}/users/${encodeURIComponent(userId)}/events`;
        method = "POST";
        graphBody = JSON.stringify({
          subject: String(params.subject || "").slice(0, 500),
          body: { contentType: "Text", content: String(params.body || "").slice(0, 10000) },
          start: { dateTime: params.startDateTime, timeZone: String(params.timeZone || "UTC").slice(0, 100) },
          end: { dateTime: params.endDateTime, timeZone: String(params.timeZone || "UTC").slice(0, 100) },
          attendees: (params.attendees || []).slice(0, 50).map((email: string) => ({
            emailAddress: { address: String(email) },
            type: "required",
          })),
        });
        break;
      }

      // ── SharePoint ──
      case "list_sites": {
        graphUrl = `${graphBase}/sites?search=${encodeURIComponent(String(params?.search || "*").slice(0, 200))}`;
        break;
      }
      case "list_drives": {
        if (!params?.siteId) throw new Error("siteId required");
        graphUrl = `${graphBase}/sites/${encodeURIComponent(params.siteId)}/drives`;
        break;
      }
      case "list_drive_items": {
        if (!params?.driveId) throw new Error("driveId required");
        const folderId = params.folderId || "root";
        graphUrl = `${graphBase}/drives/${encodeURIComponent(params.driveId)}/items/${encodeURIComponent(folderId)}/children`;
        break;
      }

      // ── OneDrive ──
      case "list_my_files": {
        const userId = params?.userId;
        if (!userId) throw new Error("userId required");
        graphUrl = `${graphBase}/users/${encodeURIComponent(userId)}/drive/root/children`;
        break;
      }

      // ── Outlook Contacts ──
      case "list_contacts": {
        const userId = params?.userId;
        if (!userId) throw new Error("userId required for list_contacts");
        const top = Math.min(Math.max(parseInt(params?.top) || 100, 1), 500);
        graphUrl = `${graphBase}/users/${encodeURIComponent(userId)}/contacts?$top=${top}&$orderby=displayName`;
        break;
      }
      case "create_contact": {
        const userId = params?.userId;
        if (!userId) throw new Error("userId required for create_contact");
        graphUrl = `${graphBase}/users/${encodeURIComponent(userId)}/contacts`;
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
        if (params.department) contactBody.department = String(params.department).slice(0, 200);
        graphBody = JSON.stringify(contactBody);
        break;
      }

      // ── Users ──
      case "list_users": {
        const top = Math.min(Math.max(parseInt(params?.top) || 100, 1), 200);
        graphUrl = `${graphBase}/users?$top=${top}`;
        break;
      }

      // ── Teams ──
      case "list_teams": {
        const userId = params?.userId;
        if (!userId) throw new Error("userId required for list_teams");
        graphUrl = `${graphBase}/users/${encodeURIComponent(userId)}/joinedTeams`;
        break;
      }
      case "list_channels": {
        if (!params?.teamId) throw new Error("teamId required");
        graphUrl = `${graphBase}/teams/${encodeURIComponent(params.teamId)}/channels`;
        break;
      }
      case "send_channel_message": {
        if (!params?.teamId || !params?.channelId) throw new Error("teamId and channelId required");
        graphUrl = `${graphBase}/teams/${encodeURIComponent(params.teamId)}/channels/${encodeURIComponent(params.channelId)}/messages`;
        method = "POST";
        graphBody = JSON.stringify({
          body: { contentType: params.contentType === "html" ? "html" : "text", content: String(params.content || "").slice(0, 50000) },
        });
        break;
      }
      case "list_channel_messages": {
        if (!params?.teamId || !params?.channelId) throw new Error("teamId and channelId required");
        const top = Math.min(Math.max(parseInt(params?.top) || 25, 1), 50);
        graphUrl = `${graphBase}/teams/${encodeURIComponent(params.teamId)}/channels/${encodeURIComponent(params.channelId)}/messages?$top=${top}`;
        break;
      }
      case "list_chats": {
        const userId = params?.userId;
        if (!userId) throw new Error("userId required for list_chats");
        const top = Math.min(Math.max(parseInt(params?.top) || 25, 1), 50);
        graphUrl = `${graphBase}/users/${encodeURIComponent(userId)}/chats?$top=${top}`;
        break;
      }
      case "send_chat_message": {
        if (!params?.chatId) throw new Error("chatId required");
        graphUrl = `${graphBase}/chats/${encodeURIComponent(params.chatId)}/messages`;
        method = "POST";
        graphBody = JSON.stringify({
          body: { contentType: params.contentType === "html" ? "html" : "text", content: String(params.content || "").slice(0, 50000) },
        });
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const graphHeaders: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const graphRes = await fetch(graphUrl, {
      method,
      headers: graphHeaders,
      body: graphBody,
    });

    const responseData = await graphRes.json();

    if (!graphRes.ok) {
      return new Response(
        JSON.stringify({ error: responseData?.error?.message || "Graph API error", details: responseData }),
        { status: graphRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("ms365-proxy error:", message);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
