import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, integrationStatus } from "@/config/env";

let browserClient: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (!integrationStatus.supabaseConfigured) return null;

  browserClient ??= createClient(env.supabaseUrl, env.supabasePublishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });

  return browserClient;
}
