"use client";

import { useMemo } from "react";
import type { DashboardRole } from "@/types/dashboard";
import { notificationService } from "@/services/notification.service";
import { useAsyncResource } from "@/hooks/use-async-resource";

export function useNotifications(role: DashboardRole) {
  const resource = useAsyncResource(() => notificationService.getNotifications(role), role);
  const unread = useMemo(() => resource.data?.filter((item) => !item.read).length ?? 0, [resource.data]);

  const markAsRead = async (id: string) => {
    resource.setData((resource.data ?? []).map((item) => item.id === id ? { ...item, read: true } : item));
    await notificationService.markAsRead(id);
  };

  const markAllAsRead = async () => {
    resource.setData((resource.data ?? []).map((item) => ({ ...item, read: true })));
    await notificationService.markAllAsRead(role);
  };

  return { ...resource, unread, markAsRead, markAllAsRead };
}
