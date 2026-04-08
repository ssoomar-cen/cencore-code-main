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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { report_id, workspace_id, dataset_id } = await req.json();

    if (!report_id || !workspace_id) {
      return new Response(
        JSON.stringify({ error: "report_id and workspace_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Power BI config from DB
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: config } = await adminClient
      .from("powerbi_config")
      .select("*")
      .limit(1)
      .single();

    if (!config?.is_configured || !config.tenant_id || !config.client_id) {
      return new Response(
        JSON.stringify({ error: "Power BI is not configured. Set up Azure AD credentials in Setup." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientSecret = Deno.env.get("POWERBI_CLIENT_SECRET");
    if (!clientSecret) {
      return new Response(
        JSON.stringify({ error: "POWERBI_CLIENT_SECRET is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Azure AD access token
    const tokenUrl = `${config.authority_url || "https://login.microsoftonline.com"}/${config.tenant_id}/oauth2/v2.0/token`;

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: config.client_id,
        client_secret: clientSecret,
        scope: "https://analysis.windows.net/powerbi/api/.default",
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("Azure AD token error:", errText);
      return new Response(
        JSON.stringify({ error: "Failed to authenticate with Azure AD" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Generate Power BI embed token
    const apiUrl = config.api_url || "https://api.powerbi.com";
    const embedUrl = `${apiUrl}/v1.0/myorg/groups/${workspace_id}/reports/${report_id}/GenerateToken`;

    const embedBody: any = { accessLevel: "View" };
    if (dataset_id) {
      embedBody.datasetId = dataset_id;
    }

    const embedResponse = await fetch(embedUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(embedBody),
    });

    if (!embedResponse.ok) {
      const errText = await embedResponse.text();
      console.error("Power BI embed token error:", errText);
      return new Response(
        JSON.stringify({ error: `Failed to generate embed token [${embedResponse.status}]` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const embedData = await embedResponse.json();

    // Get the report embed URL if not provided
    let reportEmbedUrl = "";
    const reportInfoResponse = await fetch(
      `${apiUrl}/v1.0/myorg/groups/${workspace_id}/reports/${report_id}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (reportInfoResponse.ok) {
      const reportInfo = await reportInfoResponse.json();
      reportEmbedUrl = reportInfo.embedUrl;
    }

    return new Response(
      JSON.stringify({
        token: embedData.token,
        tokenId: embedData.tokenId,
        expiration: embedData.expiration,
        embedUrl: reportEmbedUrl,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
