import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import type { DashboardRole } from "@/types/dashboard";
import { ServiceError } from "@/services/service-error";
import { getSupabaseClient } from "@/lib/supabase";
import { requireUser, throwDatabaseError } from "@/services/supabase.data";
import { normalizeLocale, type Locale } from "@/lib/i18n";

export type LoginPayload = { email: string; password: string; remember?: boolean };
export type SignupPayload = Record<string, string | string[]> & { role: DashboardRole };
export type ProfilePayload = {
  name: string;
  organization: string;
  market: string;
  email: string;
  phone: string;
  profileImageUrl?: string;
};
export type CurrentProfile = ProfilePayload & {
  id: string;
  officeId: string;
  role: DashboardRole | null;
  requestedRole: DashboardRole;
  approvalStatus: string;
  isActive: boolean;
  preferredLanguage: Locale;
};

type ProfileAccess = {
  role: DashboardRole | null;
  requested_role: DashboardRole | null;
  approval_status: string | null;
  is_active: boolean | null;
};

const PROFILE_IMAGE_BUCKET = "profile-images";
const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;
const PROFILE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const isRole = (value: unknown): value is DashboardRole =>
  value === "vendor" || value === "recycler" || value === "driver" || value === "admin";

const requireAuthClient = () => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new ServiceError(
      "Supabase Authentication is not configured. Add the project URL and anon key to your environment.",
      503,
    );
  }
  return supabase;
};

const redirectUrl = (path: string) =>
  typeof window === "undefined" ? undefined : `${window.location.origin}${path}`;

const friendlyAuthError = (message: string, fallback: string) => {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "Incorrect email or password.";
  if (normalized.includes("email not confirmed") || normalized.includes("email not verified")) return "Confirm your email before signing in.";
  if (normalized.includes("user already registered") || normalized.includes("already been registered")) return "An account already exists for this email.";
  if (normalized.includes("user not found")) return "No EcoLoop account was found for this email.";
  if (normalized.includes("database error saving new user") || normalized.includes("unexpected_failure")) return "EcoLoop account setup is incomplete in Supabase. Run the latest authentication profile migration and try again.";
  if (normalized.includes("password should") || normalized.includes("weak password")) return "Use a stronger password with at least 8 characters.";
  if (normalized.includes("expired") || normalized.includes("otp_expired")) return "This verification or password-reset link has expired. Request a new one.";
  if (normalized.includes("network") || normalized.includes("fetch") || normalized.includes("failed to fetch")) return "A network error occurred. Check your connection and try again.";
  if (normalized.includes("rate limit")) return "Too many attempts. Please wait a moment and try again.";
  return fallback;
};

const profileRole = (profile: ProfileAccess | null): DashboardRole => {
  if (isRole(profile?.role)) return profile.role;
  if (isRole(profile?.requested_role)) return profile.requested_role;
  throw new ServiceError("Your EcoLoop profile does not have a valid role.", 403);
};

export const authService = {
  async getSession(): Promise<Session | null> {
    const supabase = requireAuthClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new ServiceError(friendlyAuthError(error.message, "Your session could not be restored."), error.status);
    return data.session;
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    const supabase = requireAuthClient();
    return supabase.auth.onAuthStateChange(callback).data.subscription;
  },

  async getCurrentProfile(): Promise<CurrentProfile> {
    const supabase = requireAuthClient();
    const user = await requireUser(supabase);
    let result = await supabase.from("profiles")
      .select("email, full_name, organization_name, market, phone, profile_image_url, registration_number, role, requested_role, approval_status, is_active, preferred_language")
      .eq("id", user.id).single();

    if (result.error?.message.includes("preferred_language") || result.error?.message.includes("profile_image_url") || result.error?.message.includes("market")) {
      result = await supabase.from("profiles")
        .select("email, full_name, organization_name, phone, registration_number, role, requested_role, approval_status, is_active")
        .eq("id", user.id).single();
    }

    const { data, error } = result;
    throwDatabaseError(error, "Your profile could not be loaded.");
    if (!data) throw new ServiceError("Your profile could not be loaded.", 404);

    const row = data as Record<string, unknown>;
    return {
      id: user.id,
      officeId: String(row.registration_number ?? user.user_metadata?.employeeId ?? ""),
      name: String(row.full_name ?? ""),
      organization: String(row.organization_name ?? ""),
      market: String(row.market ?? row.organization_name ?? ""),
      email: String(user.email ?? row.email ?? ""),
      phone: String(row.phone ?? ""),
      profileImageUrl: typeof row.profile_image_url === "string" ? row.profile_image_url : undefined,
      role: isRole(row.role) ? row.role : null,
      requestedRole: isRole(row.requested_role) ? row.requested_role : "vendor",
      approvalStatus: String(row.approval_status ?? "pending"),
      isActive: row.is_active !== false,
      preferredLanguage: normalizeLocale(typeof row.preferred_language === "string" ? row.preferred_language : undefined),
    };
  },

  async login(payload: LoginPayload) {
    const supabase = requireAuthClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: payload.email.trim(),
      password: payload.password,
    });

    if (error) {
      throw new ServiceError(
        friendlyAuthError(error.message, "We couldn’t sign you in. Please try again."),
        error.status,
      );
    }

    if (!data.user.email_confirmed_at && !data.user.confirmed_at) {
      await supabase.auth.signOut();
      throw new ServiceError("Confirm your email before signing in.", 403);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, requested_role, approval_status, is_active")
      .eq("id", data.user.id)
      .maybeSingle<ProfileAccess>();
    throwDatabaseError(profileError, "Your EcoLoop profile could not be loaded.");
    if (!profile) {
      await supabase.auth.signOut();
      throw new ServiceError("Your EcoLoop profile was not found. Contact support before signing in.", 404);
    }

    const role = profileRole(profile);
    if (profile.is_active === false || profile.approval_status === "rejected") {
      await supabase.auth.signOut();
      throw new ServiceError("This EcoLoop account is not active.", 403);
    }

    const requiresApproval = profile.approval_status !== "approved" || !isRole(profile.role);
    if (requiresApproval) await supabase.auth.signOut();

    return { success: true as const, role, requiresApproval };
  },

  async signup(payload: SignupPayload) {
    const supabase = requireAuthClient();
    const { email, password, confirmPassword: _confirmPassword, role, ...fields } = payload;
    const fullName = typeof fields.name === "string"
      ? fields.name
      : typeof fields.company === "string"
        ? fields.company
        : typeof fields.shop === "string"
          ? fields.shop
          : "";
    const organization = typeof fields.company === "string"
      ? fields.company
      : typeof fields.shop === "string"
        ? fields.shop
        : "";
    const market = typeof fields.market === "string"
      ? fields.market
      : typeof fields.zone === "string"
        ? fields.zone
        : "";
    const emailRedirectTo = redirectUrl("/login?verified=1");

    const { data, error } = await supabase.auth.signUp({
      email: String(email).trim(),
      password: String(password),
      options: {
        ...(emailRedirectTo ? { emailRedirectTo } : {}),
        data: {
          ...fields,
          role,
          full_name: fullName,
          organization_name: organization,
          market,
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
    if (data.user?.identities?.length === 0) {
      throw new ServiceError("An account already exists for this email.", 409);
    }

    const requiresApproval = role === "admin";
    if (requiresApproval && data.session) await supabase.auth.signOut();

    return {
      success: true as const,
      role,
      requiresApproval,
      requiresEmailConfirmation: !data.session,
    };
  },

  async requestPasswordReset(email: string) {
    const supabase = requireAuthClient();
    const redirectTo = redirectUrl("/login?recovery=1");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      ...(redirectTo ? { redirectTo } : {}),
    });
    if (error) throw new ServiceError(friendlyAuthError(error.message, "We couldn’t send the password-reset email."), error.status);
    return { success: true as const };
  },

  async updatePassword(password: string) {
    const supabase = requireAuthClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new ServiceError(friendlyAuthError(error.message, "We couldn’t update your password."), error.status);
    return { success: true as const };
  },

  async uploadProfileImage(file: File) {
    if (!PROFILE_IMAGE_TYPES.includes(file.type)) throw new ServiceError("Use a JPG, PNG, or WEBP image.", 400);
    if (file.size > MAX_PROFILE_IMAGE_SIZE) throw new ServiceError("The profile image must be 5 MB or smaller.", 400);
    const supabase = requireAuthClient();
    const user = await requireUser(supabase);
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar-${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from(PROFILE_IMAGE_BUCKET).upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });
    if (error) throw new ServiceError(error.message || "The profile image could not be uploaded.", 500);
    return supabase.storage.from(PROFILE_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  },

  async updateProfile(payload: ProfilePayload) {
    const supabase = requireAuthClient();
    const user = await requireUser(supabase);
    const requestedEmail = payload.email.trim();
    const emailChanged = requestedEmail.toLowerCase() !== String(user.email ?? "").toLowerCase();
    let resolvedEmail = String(user.email ?? requestedEmail);
    let emailChangePending = false;
    if (emailChanged) {
      const { data, error } = await supabase.auth.updateUser({ email: requestedEmail });
      if (error) throw new ServiceError(friendlyAuthError(error.message, "We couldn’t update your email."), error.status);
      resolvedEmail = String(data.user.email ?? user.email ?? requestedEmail);
      emailChangePending = resolvedEmail.toLowerCase() !== requestedEmail.toLowerCase();
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: payload.name,
        organization_name: payload.organization,
        market: payload.market,
        phone: payload.phone,
        profile_image_url: payload.profileImageUrl ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    throwDatabaseError(error, "We couldn’t update your profile.");
    return { success: true as const, profile: { ...payload, email: emailChangePending ? requestedEmail : resolvedEmail }, emailChangePending };
  },

  async updatePreferredLanguage(preferredLanguage: Locale) {
    const supabase = requireAuthClient();
    const user = await requireUser(supabase);
    const { error } = await supabase
      .from("profiles")
      .update({ preferred_language: preferredLanguage })
      .eq("id", user.id);
    throwDatabaseError(error, "We couldn’t save your language preference.");
    return { success: true as const, preferredLanguage };
  },

  async logout() {
    const supabase = requireAuthClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw new ServiceError("We couldn’t sign you out. Please try again.", error.status);
    return { success: true as const };
  },
};
