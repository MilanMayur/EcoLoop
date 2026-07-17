import type { DashboardRole } from "@/types/dashboard";
import type { AppNotification } from "@/types/mvp";
import { serviceRequest } from "@/services/http.service";

let notifications: AppNotification[] = [
  { id: "NTF-101", role: "vendor", title: "Recycler assigned", message: "GreenCycle will arrive for ECO-2048 in approximately 18 minutes.", time: "8 min ago", read: false },
  { id: "NTF-102", role: "vendor", title: "Smart Stock alert", message: "Bananas have a high overstock risk today.", time: "24 min ago", read: false },
  { id: "NTF-201", role: "recycler", title: "New nearby pickup", message: "A 64 kg wet-waste job is available 1.2 km away.", time: "5 min ago", read: false },
  { id: "NTF-202", role: "recycler", title: "Route updated", message: "ECO-2054 was added to today’s collection route.", time: "18 min ago", read: true },
  { id: "NTF-301", role: "admin", title: "SLA attention", message: "Madiwala Market has two requests approaching the SLA threshold.", time: "12 min ago", read: false },
  { id: "NTF-302", role: "admin", title: "Daily recovery update", message: "The zone recycling rate reached 72% today.", time: "40 min ago", read: true },
];

export const notificationService = {
  getNotifications(role: DashboardRole) {
    return serviceRequest(`/notifications?role=${role}`, { method: "GET" }, () => notifications.filter((item) => item.role === role).map((item) => ({ ...item })));
  },
  markAsRead(id: string) {
    return serviceRequest(`/notifications/${id}/read`, { method: "PATCH" }, () => {
      notifications = notifications.map((item) => item.id === id ? { ...item, read: true } : item);
      return { success: true as const, id };
    });
  },
  markAllAsRead(role: DashboardRole) {
    return serviceRequest("/notifications/read-all", { method: "PATCH", body: { role } }, () => {
      notifications = notifications.map((item) => item.role === role ? { ...item, read: true } : item);
      return { success: true as const };
    });
  },
};
