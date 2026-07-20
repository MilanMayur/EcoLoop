import type { RealtimeChannel } from "@supabase/supabase-js";
import { ServiceError } from "@/services/service-error";
import {
  optionalSupabase,
  relativeTime,
  requireUser,
  throwDatabaseError,
} from "@/services/supabase.data";
import type { DashboardRole } from "@/types/dashboard";

export type SupportRequest = {
  id: string;
  userId: string;
  role: DashboardRole;
  name: string;
  email: string;
  phone: string;
  organization: string;
  market: string;
  subject: string;
  issue: string;
  status: "open" | "in_progress" | "resolved";
  createdAt: string;
  createdLabel: string;
};

type SupportRequestRow = {
  id: string;
  user_id: string;
  requester_role: DashboardRole;
  requester_name: string;
  requester_email: string;
  requester_phone: string;
  requester_organization: string;
  requester_market: string;
  subject: string;
  issue: string;
  status: SupportRequest["status"];
  created_at: string;
};

const select =
  "id, user_id, requester_role, requester_name, requester_email, requester_phone, requester_organization, requester_market, subject, issue, status, created_at";

const client = () => {
  const supabase = optionalSupabase();
  if (!supabase) {
    throw new ServiceError("Supabase is not configured.", 503);
  }
  return supabase;
};

const fromRow = (row: SupportRequestRow): SupportRequest => ({
  id: row.id,
  userId: row.user_id,
  role: row.requester_role,
  name: row.requester_name,
  email: row.requester_email,
  phone: row.requester_phone,
  organization: row.requester_organization,
  market: row.requester_market,
  subject: row.subject,
  issue: row.issue,
  status: row.status,
  createdAt: row.created_at,
  createdLabel: relativeTime(row.created_at),
});

const configurationMessage = (message: string) =>
  message.includes("support_requests") ||
  message.includes("create_support_request")
    ? "Help Centre is not configured in Supabase. Run the latest support migration."
    : message;

export const supportService = {
  async createRequest(input: { subject: string; issue: string }) {
    const supabase = client();
    await requireUser(supabase);
    const { data, error } = await supabase.rpc("create_support_request", {
      p_subject: input.subject.trim(),
      p_issue: input.issue.trim(),
    });
    if (error) {
      throw new ServiceError(configurationMessage(error.message), 500);
    }
    return String(data);
  },

  async getRequests() {
    const supabase = client();
    await requireUser(supabase);
    const { data, error } = await supabase
      .from("support_requests")
      .select(select)
      .order("created_at", { ascending: false });
    throwDatabaseError(error, "Support requests could not be loaded.");
    return ((data ?? []) as SupportRequestRow[]).map(fromRow);
  },

  subscribeToRequests(onChange: () => void) {
    const supabase = client();
    let channel: RealtimeChannel | null = supabase
      .channel(`support-requests:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_requests" },
        onChange,
      )
      .subscribe();

    return () => {
      if (channel) void supabase.removeChannel(channel);
      channel = null;
    };
  },
};
