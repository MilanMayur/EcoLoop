import type { DashboardRole } from "@/types/dashboard";

const wait = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

export type LoginPayload = { email: string; password: string; remember?: boolean };
export type SignupPayload = Record<string, string | string[]> & { role: DashboardRole };
export type PickupPayload = { wasteType: string; weight: string; priority: string; notes?: string };

export const api = {
  async login(payload: LoginPayload) {
    await wait();
    const email = payload.email.toLowerCase();
    const role: DashboardRole = email.includes("bbmp") || email.includes("admin") ? "admin" : email.includes("recycler") ? "recycler" : "vendor";
    return { success: true, role };
  },
  async signup(payload: SignupPayload) {
    await wait(700);
    return { success: true, role: payload.role, requiresApproval: payload.role === "admin" };
  },
  async createPickup(payload: PickupPayload) {
    await wait(700);
    return { success: true, id: "ECO-2058", payload };
  },
  async acceptJob(jobId: string) {
    await wait(450);
    return { success: true, jobId };
  },
  async updateProfile(payload: Record<string, string>) {
    await wait(600);
    return { success: true, payload };
  },
};
