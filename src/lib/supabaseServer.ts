import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { validateEnv } from "./env";

let supabaseServer: SupabaseClient | null = null;

export function getSupabaseServer(): SupabaseClient {
  validateEnv();
  if (supabaseServer) return supabaseServer;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or publishable/anon key) in .env.local"
    );
  }

  supabaseServer = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseServer;
}

export { supabaseServer };
