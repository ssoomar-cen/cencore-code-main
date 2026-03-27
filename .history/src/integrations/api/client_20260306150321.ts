import { createClient } from "@supabase/supabase-js";

const rawSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const rawProjectId = (import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined)?.trim();
const supabaseUrl = rawSupabaseUrl || (rawProjectId ? `https://${rawProjectId}.supabase.co` : "");

const supabaseApiKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ||
  "";

if (!supabaseUrl || !supabaseApiKey) {
  throw new Error(
    "Missing Supabase config. Set VITE_SUPABASE_URL (or VITE_SUPABASE_PROJECT_ID) and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseApiKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const apiClient = supabase;
export default supabase;
