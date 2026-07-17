import type { DashboardRole } from "@/types/dashboard";
import type { AppNotification } from "@/types/mvp";
import { mockDelay, optionalSupabase, relativeTime, requireUser, throwDatabaseError } from "@/services/supabase.data";

type NotificationRow = {
  id: string;
  role: DashboardRole;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
};

let notifications: AppNotification[] = [
  { id: "NTF-101", role: "vendor", title: "Recycler assigned", message: "GreenCycle will arrive for ECO-2048 in approximately 18 minutes.", time: "8 min ago", read: false },
  { id: "NTF-102", role: "vendor", title: "Smart Stock alert", message: "Bananas have a high overstock risk today.", time: "24 min ago", read: false },
  { id: "NTF-201", role: "recycler", title: "New nearby pickup", message: "A 64 kg wet-waste job is available 1.2 km away.", time: "5 min ago", read: false },
  { id: "NTF-202", role: "recycler", title: "Route updated", message: "ECO-2054 was added to today’s collection route.", time: "18 min ago", read: true },
  { id: "NTF-301", role: "admin", title: "SLA attention", message: "Madiwala Market has two requests approaching the SLA threshold.", time: "12 min ago", read: false },
  { id: "NTF-302", role: "admin", title: "Daily recovery update", message: "The zone recycling rate reached 72% today.", time: "40 min ago", read: true },
];

export const notificationService = {
  async getNotifications(role: DashboardRole) {
    const supabase = optionalSupabase();
    if (!supabase) { await mockDelay(); return notifications.filter((item) => item.role === role).map((item) => ({ ...item })); }
    const user = await requireUser(supabase);
    const { data, error } = await supabase.from("notifications")
      .select("id, role, title, message, read, created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    throwDatabaseError(error, "Notifications could not be loaded.");
    return (data as NotificationRow[]).map((row) => ({
      id: row.id,
      role: row.role,
      title: row.title,
      message: row.message,
      time: relativeTime(row.created_at),
      read: row.read,
    }));
  },

  async markAsRead(id: string) {
    const supabase = optionalSupabase();
    if (!supabase) {
      await mockDelay();
      notifications = notifications.map((item) => item.id === id ? { ...item, read: true } : item);
      return { success: true as const, id };
    }
    const user = await requireUser(supabase);
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id).eq("user_id", user.id);
    throwDatabaseError(error, "The notification could not be updated.");
    return { success: true as const, id };
  },

  async markAllAsRead(role: DashboardRole) {
    const supabase = optionalSupabase();
    if (!supabase) {
      await mockDelay();
      notifications = notifications.map((item) => item.role === role ? { ...item, read: true } : item);
      return { success: true as const };
    }
    const user = await requireUser(supabase);
    const { error } = await supabase.from("notifications").update({ read: true })
      .eq("user_id", user.id).eq("role", role).eq("read", false);
    throwDatabaseError(error, "Notifications could not be updated.");
    return { success: true as const };
  },
};
