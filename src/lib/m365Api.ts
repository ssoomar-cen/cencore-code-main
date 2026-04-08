import { supabase } from "@/integrations/supabase/client";

export async function callM365Api(
  action: string,
  params: Record<string, unknown>,
  tenantId: string
): Promise<unknown> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  let res: Response;
  try {
    res = await fetch("/api/ms365", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action, params, tenant_id: tenantId }),
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err.name === "AbortError") throw new Error("Request timed out — is the backend server running on port 4000?");
    // Connection refused or network error
    throw new Error("Cannot reach backend server — start it with: cd server && npm run dev");
  } finally {
    clearTimeout(timeout);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server returned non-JSON response (status ${res.status}) — restart the backend server`);
  }

  if (!res.ok) throw new Error((data as any).error || "Microsoft 365 request failed");
  return data;
}
