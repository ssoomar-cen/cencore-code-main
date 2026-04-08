import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state"); // JSON: { integration_id, redirect_url }
    const error = url.searchParams.get("error");
    const errorDesc = url.searchParams.get("error_description");

    if (error) {
      return htmlRedirectResponse(
        null,
        `Salesforce authorization failed: ${errorDesc || error}`,
        state
      );
    }

    if (!code || !state) {
      return new Response(
        JSON.stringify({ error: "Missing code or state parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let stateData: { integration_id: string; redirect_url: string; code_verifier?: string };
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid state parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Fetch integration config to get client_id, client_secret, instance_url
    const { data: integration, error: intErr } = await adminClient
      .from("integrations")
      .select("config")
      .eq("id", stateData.integration_id)
      .single();

    if (intErr || !integration?.config) {
      return htmlRedirectResponse(
        stateData.redirect_url,
        "Integration not found"
      );
    }

    const config = integration.config as Record<string, string>;
    const instanceUrl = config.instance_url?.trim().replace(/\/+$/, "");
    const clientId = config.client_id?.trim();
    const clientSecret = config.client_secret?.trim();

    if (!instanceUrl || !clientId || !clientSecret) {
      return htmlRedirectResponse(
        stateData.redirect_url,
        "Integration missing client_id, client_secret, or instance_url"
      );
    }

    // Build the redirect_uri (must match exactly what was sent in the authorize request)
    const redirectUri = `${supabaseUrl}/functions/v1/salesforce-auth-callback`;

    // Determine token endpoint
    const tokenUrl = instanceUrl.includes("test.salesforce.com") ||
      instanceUrl.includes(".sandbox.my.salesforce.com") ||
      instanceUrl.includes("--")
      ? `${instanceUrl}/services/oauth2/token`
      : `${instanceUrl}/services/oauth2/token`;

    // Exchange auth code for tokens (with PKCE code_verifier)
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });

    // Add PKCE code_verifier if present
    if (stateData.code_verifier) {
      tokenParams.set("code_verifier", stateData.code_verifier);
    }

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });

    const tokenBody = await tokenResponse.text();

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", tokenBody);
      let errorMessage = "Token exchange failed";
      try {
        const parsed = JSON.parse(tokenBody);
        errorMessage = parsed.error_description || parsed.error || errorMessage;
      } catch { /* ignore */ }
      return htmlRedirectResponse(stateData.redirect_url, errorMessage);
    }

    const tokens = JSON.parse(tokenBody) as {
      access_token: string;
      refresh_token?: string;
      instance_url: string;
      id?: string;
    };

    // Store tokens in integration config
    const updatedConfig = {
      ...config,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || "",
      token_instance_url: tokens.instance_url,
      authorized_at: new Date().toISOString(),
    };

    const { error: updateErr } = await adminClient
      .from("integrations")
      .update({
        config: updatedConfig,
        is_configured: true,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", stateData.integration_id);

    if (updateErr) {
      console.error("Failed to save tokens:", updateErr);
      return htmlRedirectResponse(stateData.redirect_url, "Failed to save authorization tokens");
    }

    // Redirect back to the app with success
    return htmlRedirectResponse(stateData.redirect_url, null);

  } catch (err: any) {
    console.error("salesforce-auth-callback error:", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function htmlRedirectResponse(
  redirectUrl: string | null,
  errorMessage: string | null,
  fallbackState?: string | null
) {
  let targetUrl = redirectUrl;

  // Try to extract redirect_url from state if not provided directly
  if (!targetUrl && fallbackState) {
    try {
      const parsed = JSON.parse(atob(fallbackState));
      targetUrl = parsed.redirect_url;
    } catch { /* ignore */ }
  }

  if (!targetUrl) {
    targetUrl = "/setup";
  }

  const separator = targetUrl.includes("?") ? "&" : "?";
  const params = errorMessage
    ? `${separator}sf_error=${encodeURIComponent(errorMessage)}`
    : `${separator}sf_auth=success`;

  const finalUrl = `${targetUrl}${params}`;

  // Return an HTML page that redirects, since we need a browser redirect
  const html = `<!DOCTYPE html>
<html>
<head><meta http-equiv="refresh" content="0;url=${finalUrl}"></head>
<body><p>Redirecting...</p><script>window.location.href="${finalUrl}";</script></body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}
