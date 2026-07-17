import type { PostgrestError, SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/services/supabase.client";
import { ServiceError } from "@/services/service-error";

export const mockDelay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export function optionalSupabase() {
  return getSupabaseClient();
}

export function requireSupabase(): SupabaseClient {
  const client = getSupabaseClient();
  if (!client) throw new ServiceError("Supabase is not configured.", 503);
  return client;
}

export async function requireUser(client: SupabaseClient): Promise<User> {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new ServiceError("Please sign in to continue.", 401);
  return data.user;
}

export function throwDatabaseError(error: PostgrestError | null, fallback: string): void {
  if (!error) return;
  const message = error.code === "42501"
    ? "You do not have permission to perform this action."
    : error.code === "23505"
      ? "This record already exists."
      : fallback;
  throw new ServiceError(message, error.code === "42501" ? 403 : error.code === "23505" ? 409 : 500);
}

export function relativeTime(value: string | null | undefined) {
  if (!value) return "—";
  const difference = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(difference / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(value));
}
