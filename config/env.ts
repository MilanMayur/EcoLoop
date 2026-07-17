const clean = (value: string | undefined) => value?.trim().replace(/\/$/, "") ?? "";

export const env = {
  apiUrl: clean(process.env.NEXT_PUBLIC_API_URL),
  supabaseUrl: clean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "",
} as const;

export const integrationStatus = {
  apiConfigured: Boolean(env.apiUrl),
  supabaseConfigured: Boolean(env.supabaseUrl && env.supabaseAnonKey),
} as const;
