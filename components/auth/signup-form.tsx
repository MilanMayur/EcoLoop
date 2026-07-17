"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Building2, Check, Recycle, ShieldCheck, Store, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/auth.service";
import { cn } from "@/lib/utils";
import type { DashboardRole } from "@/types/dashboard";

const inputClass = "mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none transition placeholder:text-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";
const labelClass = "text-xs font-semibold text-slate-700";

const signupSchema = z.object({
  name: z.string().optional(), shop: z.string().optional(), market: z.string().optional(), shopNumber: z.string().optional(),
  company: z.string().optional(), registration: z.string().optional(), categories: z.string().optional(), vehicles: z.string().optional(),
  employeeId: z.string().optional(), zone: z.string().optional(), phone: z.string().min(10, "Enter a valid phone number."),
  email: z.string().email("Enter a valid email address."), password: z.string().min(8, "Password must be at least 8 characters."),
  confirmPassword: z.string().optional(),
}).superRefine((values, context) => {
  if (values.confirmPassword && values.password !== values.confirmPassword) context.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match." });
});

type SignupValues = z.infer<typeof signupSchema>;

const roles = [
  { role: "vendor" as const, icon: Store, title: "Vendor", description: "Request pickups and track your stall’s recycling impact.", detail: "For market shops and stalls" },
  { role: "recycler" as const, icon: Recycle, title: "Recycling partner", description: "Find qualified jobs, optimize routes, and record recovery.", detail: "For authorized collectors" },
  { role: "admin" as const, icon: Building2, title: "BBMP officer", description: "Monitor markets, partners, SLAs, and circularity outcomes.", detail: "Approval required" },
];

export function SignupForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<DashboardRole | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const form = useForm<SignupValues>({ resolver: zodResolver(signupSchema), defaultValues: { phone: "", email: "", password: "", confirmPassword: "" } });
  const submit = async (values: SignupValues) => {
    if (!role) return; setError(""); setSuccess("");
    try {
      const result = await authService.signup({ role, ...Object.fromEntries(Object.entries(values).filter(([,value]) => value !== undefined).map(([key,value]) => [key, String(value)])) });
      if (result.requiresEmailConfirmation) {
        setSuccess("Account created. Check your email to confirm it before signing in.");
        return;
      }
      if (result.requiresApproval) {
        setSuccess("Account created. A BBMP administrator must approve access before you can sign in.");
        return;
      }
      router.push(`/dashboard/${role}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn’t create your workspace. Please try again.");
    }
  };
  return <div className="w-full"><div className="flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-emerald-600">Create your account</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] text-slate-950">{step === 1 ? "Choose your workspace" : `${roles.find(r => r.role === role)?.title} registration`}</h1></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-semibold text-slate-500">Step {step} of 2</span></div><div className="mt-5 flex gap-2"><span className="h-1 flex-1 rounded-full bg-emerald-600" /><span className={cn("h-1 flex-1 rounded-full", step === 2 ? "bg-emerald-600" : "bg-slate-200")} /></div>{step === 1 ? <div className="mt-8"><p className="text-sm leading-6 text-slate-500">EcoLoop adapts the same platform to how you work. Select the role that best describes you.</p><div className="mt-6 grid gap-3">{roles.map(item => <button type="button" key={item.role} onClick={() => setRole(item.role)} className={cn("group flex items-center gap-4 rounded-2xl border bg-white p-4 text-left transition-all", role === item.role ? "border-emerald-500 ring-4 ring-emerald-500/10" : "border-slate-200 hover:border-slate-300 hover:shadow-md")}><span className={cn("grid size-12 shrink-0 place-items-center rounded-xl transition", role === item.role ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600")}><item.icon className="size-5" /></span><span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-sm font-semibold text-slate-900">{item.title}{role === item.role && <Check className="size-4 text-emerald-600" />}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{item.description}</span></span><span className="hidden text-[9px] font-semibold uppercase tracking-wider text-slate-400 sm:block">{item.detail}</span></button>)}</div><Button className="mt-6 h-12 w-full" disabled={!role} onClick={() => setStep(2)}>Continue <ArrowRight className="size-4" /></Button><p className="mt-6 text-center text-xs text-slate-500">Already have an account? <Link href="/login" className="font-semibold text-emerald-600">Sign in</Link></p></div> : <FormProvider {...form}><form onSubmit={form.handleSubmit(submit)} className="mt-8" noValidate><button type="button" onClick={() => setStep(1)} className="mb-6 flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"><ArrowLeft className="size-3.5" /> Change role</button>{role === "vendor" && <VendorFields />}{role === "recycler" && <RecyclerFields />}{role === "admin" && <AdminFields />}{error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</p>}{success && <p role="status" className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-800">{success}</p>}<Button type="submit" className="mt-6 h-12 w-full" disabled={form.formState.isSubmitting || Boolean(success)}>{form.formState.isSubmitting ? "Creating workspace…" : success ? "Account created" : "Create account"}<ArrowRight className="size-4" /></Button><p className="mt-5 text-center text-[10px] leading-5 text-slate-400">By continuing, you agree to EcoLoop’s terms and responsible data policy.</p></form></FormProvider>}</div>;
}

function VendorFields() { return <div className="grid gap-4 sm:grid-cols-2"><Field label="Vendor name" name="name" placeholder="Anita Rao" /><Field label="Shop name" name="shop" placeholder="Fresh Veg Stall" /><Field label="Market name" name="market" placeholder="Chandapura Market" /><Field label="Shop number" name="shopNumber" placeholder="Block C · Stall 18" /><Field label="Phone" name="phone" type="tel" placeholder="+91 98765 43210" /><Field label="Email" name="email" type="email" placeholder="anita@example.com" /><Field label="Password" name="password" type="password" placeholder="Minimum 8 characters" /><Field label="Confirm password" name="confirmPassword" type="password" placeholder="Repeat password" /></div>; }
function RecyclerFields() { const { register } = useFormContext<SignupValues>(); return <div className="grid gap-4 sm:grid-cols-2"><Field label="Company name" name="company" placeholder="GreenCycle Pvt Ltd" /><Field label="Registration number" name="registration" placeholder="KA-RCY-2026-0184" /><label className={labelClass}>Waste categories<select {...register("categories")} className={inputClass}><option>Wet, dry, and plastic</option><option>Plastic and packaging</option><option>Metal and e-waste</option></select></label><Field label="Vehicle count" name="vehicles" type="number" placeholder="6" /><Field label="Phone" name="phone" type="tel" placeholder="+91 98765 43210" /><Field label="Email" name="email" type="email" placeholder="ops@greencycle.in" /><Field label="Password" name="password" type="password" placeholder="Minimum 8 characters" /><div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3"><Truck className="size-5 text-emerald-600" /><p className="text-[10px] leading-4 text-emerald-800">Vehicle and facility verification can be completed after signup.</p></div></div>; }
function AdminFields() { const { register } = useFormContext<SignupValues>(); return <div><div className="grid gap-4 sm:grid-cols-2"><Field label="Officer name" name="name" placeholder="Priya Nair" /><Field label="Employee ID" name="employeeId" placeholder="BBMP-18472" /><label className={labelClass}>Zone<select {...register("zone")} className={inputClass}><option>Bommanahalli</option><option>South</option><option>East</option><option>West</option><option>Yelahanka</option></select></label><Field label="Phone" name="phone" type="tel" placeholder="+91 98765 43210" /><Field label="Official email" name="email" type="email" placeholder="priya.nair@bbmp.gov.in" /><Field label="Password" name="password" type="password" placeholder="Minimum 8 characters" /></div><div className="mt-5 flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4"><ShieldCheck className="size-5 shrink-0 text-blue-600" /><div><p className="text-xs font-semibold text-blue-900">Super Admin approval required</p><p className="mt-1 text-[10px] leading-4 text-blue-700">Your official credentials will be reviewed before live operational access is enabled. Demo access remains available.</p></div></div></div>; }
function Field({ label, name, type = "text", placeholder }: { label: string; name: keyof SignupValues; type?: string; placeholder: string }) { const { register, formState: { errors } } = useFormContext<SignupValues>(); const message = errors[name]?.message; return <label className={labelClass}>{label}<input {...register(name)} type={type} placeholder={placeholder} className={inputClass} />{typeof message === "string" && <span className="mt-1.5 block text-[10px] text-rose-600">{message}</span>}</label>; }
