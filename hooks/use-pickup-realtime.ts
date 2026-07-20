"use client";

import { useEffect } from "react";
import { pickupService } from "@/services/pickup.service";

export function usePickupRealtime(reload: () => void) {
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = pickupService.subscribeToRequests(reload);
    } catch {
      // Initial data loading already presents configuration errors. Realtime is
      // an enhancement and must not make the page unusable on its own.
    }
    return () => unsubscribe?.();
  }, [reload]);
}
