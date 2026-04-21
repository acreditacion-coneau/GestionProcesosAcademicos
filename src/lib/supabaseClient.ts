import { createClient } from "@supabase/supabase-js";

const projectId = (import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "").trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

export const hasSupabaseConfig = Boolean(projectId && anonKey);

const supabaseUrl = hasSupabaseConfig ? `https://${projectId}.supabase.co` : "https://invalid.supabase.co";
const supabaseKey = hasSupabaseConfig ? anonKey : "invalid-anon-key";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
