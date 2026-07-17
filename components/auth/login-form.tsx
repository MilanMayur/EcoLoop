"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/auth.service";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  remember: z.boolean().optional(),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { remember: false } });
  const submit = async (values: LoginValues) => {
    setError("");
    try { const result = await authService.login(values); router.push(`/dashboard/${result.role}`); }
    catch { setError("We couldn’t sign you in. Please try again."); }
  };
  return <div className="w-full"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-emerald-600">Welcome back</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] text-slate-950 sm:text-4xl">Sign in to EcoLoop</h1><p className="mt-3 text-sm leading-6 text-slate-500">Access the workspace tailored to your role.</p><form onSubmit={handleSubmit(submit)} className="mt-8 space-y-5" noValidate><label className="block text-xs font-semibold text-slate-700">Email address<div className="relative mt-2"><Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input {...register("email")} type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" /></div>{errors.email && <span className="mt-1.5 block text-[10px] text-rose-600">{errors.email.message}</span>}</label><label className="block text-xs font-semibold text-slate-700">Password<div className="relative mt-2"><LockKeyhole className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input {...register("password")} type={show ? "text" : "password"} autoComplete="current-password" aria-invalid={Boolean(errors.password)} className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-11 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" /><button type="button" onClick={() => setShow(!show)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div>{errors.password && <span className="mt-1.5 block text-[10px] text-rose-600">{errors.password.message}</span>}</label><div className="flex items-center justify-between"><label className="flex items-center gap-2 text-xs text-slate-500"><input {...register("remember")} type="checkbox" className="size-4 rounded accent-emerald-600" /> Remember me</label><button type="button" disabled title="Coming Soon" className="cursor-not-allowed text-xs font-semibold text-slate-400">Forgot password? · Coming Soon</button></div>{error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</p>}<Button className="h-12 w-full" type="submit" disabled={isSubmitting}>{isSubmitting ? "Signing in…" : "Sign in"}<ArrowRight className="size-4" /></Button></form><div className="my-6 flex items-center gap-3"><span className="h-px flex-1 bg-slate-200" /><span className="text-[10px] uppercase tracking-wider text-slate-400">or</span><span className="h-px flex-1 bg-slate-200" /></div><Button variant="outline" className="h-12 w-full" disabled title="Coming Soon"><span className="text-sm font-bold text-slate-400">G</span> Google sign-in · Coming Soon</Button><p className="mt-7 text-center text-xs text-slate-500">Don’t have an account? <Link href="/signup" className="font-semibold text-emerald-600 hover:text-emerald-700">Create one</Link></p></div>;
}
