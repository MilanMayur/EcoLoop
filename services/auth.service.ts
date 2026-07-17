import type { DashboardRole } from "@/types/dashboard";
import { serviceRequest } from "@/services/http.service";

export type LoginPayload = { email: string; password: string; remember?: boolean };
export type SignupPayload = Record<string, string | string[]> & { role: DashboardRole };
export type ProfilePayload = { name: string; organization: string; email: string; phone: string };

export const authService = {
  login(payload: LoginPayload) {
    return serviceRequest("/auth/login", { method: "POST", body: payload }, () => {
      const email = payload.email.toLowerCase();
      const role: DashboardRole = email.includes("bbmp") || email.includes("admin") ? "admin" : email.includes("recycler") ? "recycler" : "vendor";
      return { success: true as const, role };
    });
  },
  signup(payload: SignupPayload) {
    return serviceRequest("/auth/signup", { method: "POST", body: payload }, () => ({ success: true as const, role: payload.role, requiresApproval: payload.role === "admin" }));
  },
  updateProfile(payload: ProfilePayload) {
    return serviceRequest("/auth/profile", { method: "PATCH", body: payload }, () => ({ success: true as const, profile: payload }));
  },
};
