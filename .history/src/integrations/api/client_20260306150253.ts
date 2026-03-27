import { createClient } from "@supabase/supabase-js";

<<<<<<< HEAD
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
=======
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseApiKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string);
>>>>>>> 23a02fbc046ebced0f000daf8c1fc6104a92eca1

export const apiClient = supabase;
export default supabase;
