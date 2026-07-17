const clean = (value: string | undefined) => value?.trim().replace(/\/$/, "") ?? "";

export const env = {
  supabaseUrl: clean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabasePublishableKey: (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim() ?? "",
} as const;

export const integrationStatus = {
  supabaseConfigured: Boolean(env.supabaseUrl && env.supabasePublishableKey),
} as const;
