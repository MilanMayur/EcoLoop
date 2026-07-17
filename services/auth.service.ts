import type { DashboardRole } from "@/types/dashboard";
import { ServiceError } from "@/services/service-error";
import { getSupabaseClient } from "@/services/supabase.client";
import { mockDelay, requireUser, throwDatabaseError } from "@/services/supabase.data";

export type LoginPayload = { email: string; password: string; remember?: boolean };
export type SignupPayload = Record<string, string | string[]> & { role: DashboardRole };
export type ProfilePayload = { name: string; organization: string; email: string; phone: string };
export type CurrentProfile = ProfilePayload & { role: DashboardRole | null; requestedRole: DashboardRole; approvalStatus: string; isActive: boolean };

type ProfileAccess = {
  role: DashboardRole | null;
  requested_role: DashboardRole | null;
  approval_status: string | null;
  is_active: boolean | null;
};

const isRole = (value: unknown): value is DashboardRole =>
  value === "vendor" || value === "recycler" || value === "admin";

const roleFromEmail = (email: string): DashboardRole => {
  const normalized = email.toLowerCase();
  if (normalized.includes("bbmp") || normalized.includes("admin")) return "admin";
  if (normalized.includes("recycler")) return "recycler";
  return "vendor";
};

const friendlyAuthError = (message: string, fallback: string) => {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "Incorrect email or password.";
  if (normalized.includes("email not confirmed")) return "Confirm your email before signing in.";
  if (normalized.includes("user already registered")) return "An account already exists for this email.";
  if (normalized.includes("password")) return "Use a stronger password with at least 8 characters.";
  if (normalized.includes("rate limit")) return "Too many attempts. Please wait a moment and try again.";
  return fallback;
};

export const authService = {
  async getCurrentProfile(): Promise<CurrentProfile | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    const user = await requireUser(supabase);
    const { data, error } = await supabase.from("profiles")
      .select("email, full_name, organization_name, phone, role, requested_role, approval_status, is_active")
      .eq("id", user.id).single();
    throwDatabaseError(error, "Your profile could not be loaded.");
    if (!data) throw new ServiceError("Your profile could not be loaded.", 404);
    return {
      name: data.full_name,
      organization: data.organization_name,
      email: data.email,
      phone: data.phone,
      role: isRole(data.role) ? data.role : null,
      requestedRole: isRole(data.requested_role) ? data.requested_role : "vendor",
      approvalStatus: data.approval_status,
      isActive: data.is_active,
    };
  },

  async login(payload: LoginPayload) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: payload.email,
        password: payload.password,
      });

      if (error) {
        throw new ServiceError(
          friendlyAuthError(error.message, "We couldn’t sign you in. Please try again."),
          error.status,
        );
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, requested_role, approval_status, is_active")
        .eq("id", data.user.id)
        .maybeSingle<ProfileAccess>();

      if (profile?.is_active === false) {
        await supabase.auth.signOut();
        throw new ServiceError("This EcoLoop account has been deactivated.", 403);
      }

      const metadataRole = data.user.user_metadata?.role;
      const role = isRole(profile?.role)
        ? profile.role
        : isRole(profile?.requested_role)
          ? profile.requested_role
          : isRole(metadataRole)
            ? metadataRole
            : roleFromEmail(payload.email);

      return {
        success: true as const,
        role,
        requiresApproval: profile?.approval_status === "pending",
      };
    }

    await mockDelay();
    return {
      success: true as const,
      role: roleFromEmail(payload.email),
      requiresApproval: false,
    };
  },

  async signup(payload: SignupPayload) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { email, password, confirmPassword: _confirmPassword, role, ...fields } = payload;
      const fullName = typeof fields.name === "string" ? fields.name : "";
      const organization = typeof fields.company === "string"
        ? fields.company
        : typeof fields.shop === "string"
          ? fields.shop
          : "";

      const { data, error } = await supabase.auth.signUp({
        email: String(email),
        password: String(password),
        options: {
          data: {
            ...fields,
            role,
            full_name: fullName,
            organization_name: organization,
          },
        },
      });

      void _confirmPassword;

      if (error) {
        throw new ServiceError(
          friendlyAuthError(error.message, "We couldn’t create your account. Please try again."),
          error.status,
        );
      }

      const requiresApproval = role === "admin";
      if (requiresApproval && data.session) await supabase.auth.signOut();

      return {
        success: true as const,
        role,
        requiresApproval,
        requiresEmailConfirmation: !data.session,
      };
    }

    await mockDelay();
    return {
      success: true as const,
      role: payload.role,
      requiresApproval: payload.role === "admin",
      requiresEmailConfirmation: false,
    };
  },

  async updateProfile(payload: ProfilePayload) {
    const supabase = getSupabaseClient();
    if (!supabase) {
      await mockDelay();
      return {
        success: true as const,
        profile: payload,
      };
    }

    const user = await requireUser(supabase);
    if (payload.email !== user.email) {
      const { error } = await supabase.auth.updateUser({ email: payload.email });
      if (error) throw new ServiceError(friendlyAuthError(error.message, "We couldn’t update your email."), error.status);
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: payload.name,
        organization_name: payload.organization,
        phone: payload.phone,
      })
      .eq("id", user.id);
    throwDatabaseError(error, "We couldn’t update your profile.");

    return {
      success: true as const,
      profile: payload,
    };
  },

  async logout() {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw new ServiceError("We couldn’t sign you out. Please try again.", error.status);
    }
    return { success: true as const };
  },
};
