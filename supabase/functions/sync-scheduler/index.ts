import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Dependency order: parent objects must sync before children that reference them as FKs.
const SYNC_ORDER = [
  "accounts",          // root entity — no dependencies
  "contacts",          // depends on accounts
  "leads",             // independent
  "campaigns",         // independent
  "opportunities",     // depends on accounts, contacts
  "quotes",            // depends on opportunities
  "measures",
  "energy_programs",   // depends on accounts
  "contracts",         // depends on accounts, opportunities
  "buildings",         // depends on energy_programs
  "credentials",
  "activities",        // depends on accounts, contacts, opportunities
  "events",            // depends on accounts, contacts
  "cases",             // depends on accounts, contacts
  "connections",       // depends on contacts
  "invoices",          // depends on accounts, energy_programs
  "invoice_items",     // depends on invoices, energy_programs
  "commission_splits", // depends on opportunities
  "commission_split_schedules",
  "energy_program_team_members",
];

// Called by pg_cron every minute. Checks sync_schedules for due syncs and triggers them.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Find active schedules that are due
    const now = new Date().toISOString();
    const { data: dueSchedules, error } = await adminClient
      .from("sync_schedules")
      .select("*")
      .eq("is_active", true)
      .or(`next_sync_at.is.null,next_sync_at.lte.${now}`);

    if (error) {
      console.error("Failed to query sync_schedules:", error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!dueSchedules || dueSchedules.length === 0) {
      return new Response(JSON.stringify({ message: "No syncs due" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const schedule of dueSchedules) {
      try {
        const objects = (schedule.sync_objects || []).slice().sort(
          (a: string, b: string) => {
            const ai = SYNC_ORDER.indexOf(a);
            const bi = SYNC_ORDER.indexOf(b);
            return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
          }
        );
        const syncResults: any[] = [];

        // Sync one object at a time to avoid CPU time exceeded
        for (const obj of objects) {
          try {
            const syncUrl = `${supabaseUrl}/functions/v1/salesforce-sync`;
            const syncRes = await fetch(syncUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${anonKey}`,
              },
              body: JSON.stringify({
                integration_id: schedule.integration_id,
                direction: schedule.sync_direction || "pull",
                objects: [obj],
                tenant_id: schedule.tenant_id,
                scheduled: true,
              }),
            });
            await syncRes.text();
            syncResults.push({ object: obj, status: syncRes.status });
          } catch (objErr: any) {
            console.error(`Object ${obj} sync failed:`, objErr.message);
            syncResults.push({ object: obj, error: objErr.message });
          }
        }

        console.log(`Sync for schedule ${schedule.id}: completed ${syncResults.length} objects`);

        // Update next_sync_at
        const nextSync = new Date(Date.now() + (schedule.interval_minutes || 10) * 60 * 1000);
        await adminClient.from("sync_schedules").update({
          next_sync_at: nextSync.toISOString(),
          last_auto_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as never).eq("id", schedule.id);

        results.push({ schedule_id: schedule.id, objects_synced: syncResults.length });
      } catch (scheduleErr: any) {
        console.error(`Schedule ${schedule.id} failed:`, scheduleErr.message);
        results.push({ schedule_id: schedule.id, error: scheduleErr.message });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("sync-scheduler error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
