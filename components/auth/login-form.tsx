"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthToast } from "@/components/auth/auth-toast";
import { authService } from "@/services/auth.service";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  remember: z.boolean().optional(),
});

const recoverySchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters."),
  confirmPassword: z.string(),
}).refine((values) => values.password === values.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type LoginValues = z.infer<typeof loginSchema>;
type RecoveryValues = z.infer<typeof recoverySchema>;

export function LoginForm() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resetting, setResetting] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { remember: false } });
  const recoveryForm = useForm<RecoveryValues>({ resolver: zodResolver(recoverySchema) });

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const linkError = query.get("error_description") ?? hash.get("error_description");
    const errorCode = query.get("error_code") ?? hash.get("error_code");
    let setupError = "";

    const frame = requestAnimationFrame(() => {
      if (linkError || errorCode) {
        const expired = `${linkError ?? ""} ${errorCode ?? ""}`.toLowerCase().includes("expired");
        setError(expired ? "This verification or password-reset link has expired. Request a new one." : decodeURIComponent((linkError ?? "The authentication link is invalid.").replace(/\+/g, " ")));
      }
      if (query.get("recovery") === "1") setRecoveryMode(true);
      if (query.get("verified") === "1") setNotice("Email verified successfully. You can now sign in.");
      if (setupError) setError(setupError);
    });

    let subscription: ReturnType<typeof authService.onAuthStateChange> | undefined;
    try {
      subscription = authService.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") {
          setRecoveryMode(true);
          setError("");
        }
        if (event === "SIGNED_IN" && query.get("verified") === "1") {
          setNotice("Email verified successfully. Your EcoLoop account is ready.");
        }
      });
    } catch (caught) {
      setupError = caught instanceof Error ? caught.message : "Supabase Authentication is unavailable.";
    }
    return () => { cancelAnimationFrame(frame); subscription?.unsubscribe(); };
  }, []);

  const submit = async (values: LoginValues) => {
    setError("");
    try {
      const result = await authService.login(values);
      if (result.requiresApproval) {
        setError("Your account is awaiting administrator approval.");
        return;
      }
      router.push(`/dashboard/${result.role}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn’t sign you in. Please try again.");
    }
  };

  const forgotPassword = async () => {
    setError("");
    const parsed = z.string().email("Enter your email address first.").safeParse(loginForm.getValues("email"));
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid email address.");
      return;
    }
    setResetting(true);
    try {
      await authService.requestPasswordReset(parsed.data);
      setNotice("Password-reset instructions have been sent. Check your email.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn’t send the password-reset email.");
    } finally {
      setResetting(false);
    }
  };

  const updatePassword = async (values: RecoveryValues) => {
    setError("");
    try {
      await authService.updatePassword(values.password);
      await authService.logout();
      recoveryForm.reset();
      setRecoveryMode(false);
      window.history.replaceState({}, "", "/login");
      setNotice("Your password has been updated. Sign in with your new password.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn’t update your password.");
    }
  };

  if (recoveryMode) {
    return <div className="w-full"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-emerald-600">Account recovery</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] text-slate-950 sm:text-4xl">Set a new password</h1><p className="mt-3 text-sm leading-6 text-slate-500">Choose a secure password for your EcoLoop account.</p><form onSubmit={recoveryForm.handleSubmit(updatePassword)} className="mt-8 space-y-5" noValidate><PasswordField label="New password" registration={recoveryForm.register("password")} error={recoveryForm.formState.errors.password?.message} show={show} onToggle={() => setShow(!show)} autoComplete="new-password" /><PasswordField label="Confirm password" registration={recoveryForm.register("confirmPassword")} error={recoveryForm.formState.errors.confirmPassword?.message} show={show} onToggle={() => setShow(!show)} autoComplete="new-password" />{error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</p>}<Button className="h-12 w-full" type="submit" disabled={recoveryForm.formState.isSubmitting}>{recoveryForm.formState.isSubmitting ? "Updating password…" : "Update password"}<ArrowRight className="size-4" /></Button></form>{notice && <AuthToast message={notice} onClose={() => setNotice("")} />}</div>;
  }

  return <div className="w-full"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-emerald-600">Welcome back</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] text-slate-950 sm:text-4xl">Sign in to EcoLoop</h1><p className="mt-3 text-sm leading-6 text-slate-500">Access the workspace tailored to your role.</p><form onSubmit={loginForm.handleSubmit(submit)} className="mt-6 space-y-4 sm:mt-8 sm:space-y-5" noValidate><label className="block text-xs font-semibold text-slate-700">Email address<div className="relative mt-2"><Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input {...loginForm.register("email")} type="email" autoComplete="email" aria-invalid={Boolean(loginForm.formState.errors.email)} className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-base outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 sm:text-sm" /></div>{loginForm.formState.errors.email && <span className="mt-1.5 block text-[10px] text-rose-600">{loginForm.formState.errors.email.message}</span>}</label><PasswordField label="Password" registration={loginForm.register("password")} error={loginForm.formState.errors.password?.message} show={show} onToggle={() => setShow(!show)} autoComplete="current-password" /><div className="flex flex-col gap-1 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between"><label className="flex min-h-11 items-center gap-2 text-xs text-slate-500"><input {...loginForm.register("remember")} type="checkbox" className="size-5 rounded accent-emerald-600" /> Remember me</label><button type="button" disabled={resetting || loginForm.formState.isSubmitting} onClick={forgotPassword} className="min-h-11 self-start text-xs font-semibold text-emerald-600 disabled:text-slate-400">{resetting ? "Sending reset email…" : "Forgot password?"}</button></div>{error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</p>}<Button className="h-12 w-full" type="submit" disabled={loginForm.formState.isSubmitting || resetting}>{loginForm.formState.isSubmitting ? "Signing in…" : "Sign in"}<ArrowRight className="size-4" /></Button></form><div className="my-5 flex items-center gap-3 sm:my-6"><span className="h-px flex-1 bg-slate-200" /><span className="text-[10px] uppercase tracking-wider text-slate-400">or</span><span className="h-px flex-1 bg-slate-200" /></div><Button variant="outline" className="h-12 w-full" disabled title="Coming Soon"><span className="text-sm font-bold text-slate-400">G</span> Google sign-in · Coming Soon</Button><p className="mt-5 text-center text-xs text-slate-500 sm:mt-7">Don’t have an account? <Link href="/signup" className="inline-flex min-h-11 items-center font-semibold text-emerald-600 hover:text-emerald-700">Create one</Link></p>{notice && <AuthToast message={notice} onClose={() => setNotice("")} />}</div>;
}

function PasswordField({ label, registration, error, show, onToggle, autoComplete }: { label: string; registration: UseFormRegisterReturn; error?: string; show: boolean; onToggle: () => void; autoComplete: string }) {
  return <label className="block text-xs font-semibold text-slate-700">{label}<div className="relative mt-2"><LockKeyhole className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input {...registration} type={show ? "text" : "password"} autoComplete={autoComplete} aria-invalid={Boolean(error)} className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-12 text-base outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 sm:text-sm" /><button type="button" onClick={onToggle} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-400" aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div>{error && <span className="mt-1.5 block text-[10px] text-rose-600">{error}</span>}</label>;
}
