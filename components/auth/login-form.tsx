"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLoading(true); setError("");
    const form = new FormData(event.currentTarget);
    try { const result = await api.login({ email: String(form.get("email")), password: String(form.get("password")), remember: form.get("remember") === "on" }); router.push(`/dashboard/${result.role}`); }
    catch { setError("We couldn’t sign you in. Please try again."); setLoading(false); }
  };
  return <div className="w-full"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-emerald-600">Welcome back</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] text-slate-950 sm:text-4xl">Sign in to EcoLoop</h1><p className="mt-3 text-sm leading-6 text-slate-500">Access the workspace tailored to your role.</p><form onSubmit={submit} className="mt-8 space-y-5"><label className="block text-xs font-semibold text-slate-700">Email address<div className="relative mt-2"><Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input name="email" type="email" required autoComplete="email" className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" /></div></label><label className="block text-xs font-semibold text-slate-700">Password<div className="relative mt-2"><LockKeyhole className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input name="password" type={show ? "text" : "password"} required autoComplete="current-password" className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-11 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" /><button type="button" onClick={() => setShow(!show)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></label><div className="flex items-center justify-between"><label className="flex items-center gap-2 text-xs text-slate-500"><input name="remember" type="checkbox" className="size-4 rounded accent-emerald-600" /> Remember me</label><button type="button" className="text-xs font-semibold text-emerald-600">Forgot password?</button></div>{error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</p>}<Button className="h-12 w-full" type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in"}<ArrowRight className="size-4" /></Button></form><div className="my-6 flex items-center gap-3"><span className="h-px flex-1 bg-slate-200" /><span className="text-[10px] uppercase tracking-wider text-slate-400">or</span><span className="h-px flex-1 bg-slate-200" /></div><Button variant="outline" className="h-12 w-full"><span className="text-sm font-bold text-blue-500">G</span> Continue with Google</Button><p className="mt-7 text-center text-xs text-slate-500">Don’t have an account? <Link href="/signup" className="font-semibold text-emerald-600 hover:text-emerald-700">Create one</Link></p></div>;
}
