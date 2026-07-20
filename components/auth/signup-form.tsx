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
import { useLanguage } from "@/components/i18n/language-provider";

const inputClass = "mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base outline-none transition placeholder:text-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 sm:text-sm";
const labelClass = "text-xs font-semibold text-slate-700";
const passwordHelp = "Use 8–72 characters with uppercase, lowercase, number, and special character.";

const signupSchema = z.object({
  name: z.string().trim().optional(), shop: z.string().trim().optional(), market: z.string().trim().optional(), shopNumber: z.string().trim().optional(),
  company: z.string().trim().optional(), registration: z.string().trim().optional(), categories: z.string().trim().optional(), vehicles: z.string().trim().optional(),
  employeeId: z.string().trim().optional(), zone: z.string().trim().optional(),
  phone: z.string().trim().refine((value) => /^\+?[0-9\s()-]{10,18}$/.test(value) && value.replace(/\D/g, "").length >= 10, "Enter a valid phone number."),
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  password: z.string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must be 72 characters or fewer.")
    .regex(/[a-z]/, "Password must include a lowercase letter.")
    .regex(/[A-Z]/, "Password must include an uppercase letter.")
    .regex(/[0-9]/, "Password must include a number.")
    .regex(/[^A-Za-z0-9]/, "Password must include a special character.")
    .regex(/^\S+$/, "Password cannot contain spaces."),
  confirmPassword: z.string().min(1, "Confirm your password."),
}).superRefine((values, context) => {
  if (values.password !== values.confirmPassword) context.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match." });
});

type SignupValues = z.infer<typeof signupSchema>;
type SignupRole = Exclude<DashboardRole, "driver">;

const requiredRoleFields: Record<SignupRole, Array<{ name: keyof SignupValues; label: string }>> = {
  vendor: [{ name: "name", label: "Vendor name" }, { name: "shop", label: "Shop name" }, { name: "market", label: "Market name" }, { name: "shopNumber", label: "Shop number" }],
  recycler: [{ name: "company", label: "Company name" }, { name: "registration", label: "Registration number" }, { name: "categories", label: "Waste categories" }, { name: "vehicles", label: "Vehicle count" }],
  admin: [{ name: "name", label: "Officer name" }, { name: "employeeId", label: "Employee ID" }, { name: "zone", label: "Zone" }],
};

const roles = [
  { role: "vendor" as const, icon: Store, title: "Vendor", description: "Request pickups and track your stall’s recycling impact.", detail: "For market shops and stalls" },
  { role: "recycler" as const, icon: Recycle, title: "Recycling partner", description: "Find qualified jobs, optimize routes, and record recovery.", detail: "For authorized collectors" },
  { role: "admin" as const, icon: Building2, title: "BBMP officer", description: "Monitor markets, partners, SLAs, and circularity outcomes.", detail: "Approval required" },
];

export function SignupForm() {
  const router = useRouter();
  const { locale } = useLanguage();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<SignupRole | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const form = useForm<SignupValues>({ resolver: zodResolver(signupSchema), defaultValues: { phone: "", email: "", password: "", confirmPassword: "", categories: "", zone: "" } });
  const submit = async (values: SignupValues) => {
    if (!role) return;
    let hasMissingField = false;
    requiredRoleFields[role].forEach(({ name, label }) => {
      if (!String(values[name] ?? "").trim()) {
        form.setError(name, { type: "manual", message: `${label} is required.` });
        hasMissingField = true;
      }
    });
    if (role === "recycler" && values.vehicles && !/^[1-9]\d*$/.test(values.vehicles)) {
      form.setError("vehicles", { type: "manual", message: "Enter at least one vehicle." });
      hasMissingField = true;
    }
    if (hasMissingField) return;
    setError(""); setSuccess("");
    try {
      const result = await authService.signup({ role, preferred_language: locale, ...Object.fromEntries(Object.entries(values).filter(([,value]) => value !== undefined).map(([key,value]) => [key, String(value)])) });
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
  return <div className="w-full"><div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-emerald-600">Create your account</p><h1 className="mt-2 text-2xl font-semibold tracking-[-.05em] text-slate-950 sm:text-3xl">{step === 1 ? "Choose your workspace" : `${roles.find(r => r.role === role)?.title} registration`}</h1></div><span className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-semibold text-slate-500">Step {step} of 2</span></div><div className="mt-4 flex gap-2 sm:mt-5"><span className="h-1 flex-1 rounded-full bg-emerald-600" /><span className={cn("h-1 flex-1 rounded-full", step === 2 ? "bg-emerald-600" : "bg-slate-200")} /></div>{step === 1 ? <div className="mt-6 sm:mt-8"><p className="text-sm leading-6 text-slate-500">EcoLoop adapts the same platform to how you work. Select the role that best describes you.</p><div className="mt-5 grid gap-3 sm:mt-6">{roles.map(item => <button type="button" key={item.role} onClick={() => setRole(item.role)} className={cn("group flex min-h-20 items-center gap-3 rounded-2xl border bg-white p-3.5 text-left transition-all sm:gap-4 sm:p-4", role === item.role ? "border-emerald-500 ring-4 ring-emerald-500/10" : "border-slate-200 hover:border-slate-300 hover:shadow-md")}><span className={cn("grid size-11 shrink-0 place-items-center rounded-xl transition sm:size-12", role === item.role ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600")}><item.icon className="size-5" /></span><span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-sm font-semibold text-slate-900">{item.title}{role === item.role && <Check className="size-4 text-emerald-600" />}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{item.description}</span></span><span className="hidden text-[9px] font-semibold uppercase tracking-wider text-slate-400 sm:block">{item.detail}</span></button>)}</div><Button className="mt-5 h-12 w-full sm:mt-6" disabled={!role} onClick={() => setStep(2)}>Continue <ArrowRight className="size-4" /></Button><p className="mt-4 text-center text-xs text-slate-500 sm:mt-6">Already have an account? <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-emerald-600">Sign in</Link></p></div> : <FormProvider {...form}><form onSubmit={form.handleSubmit(submit)} className="mt-6 sm:mt-8" noValidate><button type="button" onClick={() => setStep(1)} className="mb-4 flex min-h-11 items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 sm:mb-6"><ArrowLeft className="size-3.5" /> Change role</button>{role === "vendor" && <VendorFields />}{role === "recycler" && <RecyclerFields />}{role === "admin" && <AdminFields />}{error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</p>}{success && <p role="status" className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-800">{success}</p>}<Button type="submit" className="mt-5 h-12 w-full sm:mt-6" disabled={form.formState.isSubmitting || Boolean(success)}>{form.formState.isSubmitting ? "Creating workspace…" : success ? "Account created" : "Create account"}<ArrowRight className="size-4" /></Button><p className="mt-4 text-center text-[10px] leading-5 text-slate-400 sm:mt-5">By continuing, you agree to EcoLoop’s terms and responsible data policy.</p></form></FormProvider>}</div>;
}

function VendorFields() { return <div className="grid gap-4 sm:grid-cols-2"><Field label="Vendor name" name="name" placeholder="Anita Rao" /><Field label="Shop name" name="shop" placeholder="Fresh Veg Stall" /><Field label="Market name" name="market" placeholder="Chandapura Market" /><Field label="Shop number" name="shopNumber" placeholder="Block C · Stall 18" /><Field label="Phone" name="phone" type="tel" placeholder="+91 98765 43210" /><Field label="Email" name="email" type="email" placeholder="anita@example.com" /><Field label="Password" name="password" type="password" placeholder="Create a strong password" helper={passwordHelp} /><Field label="Confirm password" name="confirmPassword" type="password" placeholder="Repeat password" /></div>; }
function RecyclerFields() { return <div className="grid gap-4 sm:grid-cols-2"><Field label="Company name" name="company" placeholder="GreenCycle Pvt Ltd" /><Field label="Registration number" name="registration" placeholder="KA-RCY-2026-0184" /><SelectField label="Waste categories" name="categories" options={["Wet, dry, and plastic", "Plastic and packaging", "Metal and e-waste"]} /><Field label="Vehicle count" name="vehicles" type="number" placeholder="6" /><Field label="Phone" name="phone" type="tel" placeholder="+91 98765 43210" /><Field label="Email" name="email" type="email" placeholder="ops@greencycle.in" /><Field label="Password" name="password" type="password" placeholder="Create a strong password" helper={passwordHelp} /><Field label="Confirm password" name="confirmPassword" type="password" placeholder="Repeat password" /><div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3 sm:col-span-2"><Truck className="size-5 text-emerald-600" /><p className="text-[10px] leading-4 text-emerald-800">Vehicle and facility verification can be completed after signup.</p></div></div>; }
function AdminFields() { return <div><div className="grid gap-4 sm:grid-cols-2"><Field label="Officer name" name="name" placeholder="Priya Nair" /><Field label="Employee ID" name="employeeId" placeholder="BBMP-18472" /><SelectField label="Zone" name="zone" options={["Bommanahalli", "South", "East", "West", "Yelahanka"]} /><Field label="Phone" name="phone" type="tel" placeholder="+91 98765 43210" /><Field label="Official email" name="email" type="email" placeholder="priya.nair@bbmp.gov.in" /><Field label="Password" name="password" type="password" placeholder="Create a strong password" helper={passwordHelp} /><Field label="Confirm password" name="confirmPassword" type="password" placeholder="Repeat password" /></div><div className="mt-5 flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4"><ShieldCheck className="size-5 shrink-0 text-blue-600" /><div><p className="text-xs font-semibold text-blue-900">Super Admin approval required</p><p className="mt-1 text-[10px] leading-4 text-blue-700">Your official credentials will be reviewed before live operational access is enabled.</p></div></div></div>; }
function Field({ label, name, type = "text", placeholder, helper }: { label: string; name: keyof SignupValues; type?: string; placeholder: string; helper?: string }) { const { register, formState: { errors } } = useFormContext<SignupValues>(); const message = errors[name]?.message; return <label className={labelClass}>{label} *<input {...register(name)} type={type} placeholder={placeholder} required aria-required="true" className={inputClass} />{helper && <span className="mt-1.5 block text-[10px] font-normal leading-4 text-slate-400">{helper}</span>}{typeof message === "string" && <span className="mt-1.5 block text-[10px] text-rose-600">{message}</span>}</label>; }
function SelectField({ label, name, options }: { label: string; name: "categories" | "zone"; options: string[] }) { const { register, formState: { errors } } = useFormContext<SignupValues>(); const message = errors[name]?.message; return <label className={labelClass}>{label} *<select {...register(name)} required aria-required="true" className={inputClass}><option value="">Select {label.toLowerCase()}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>{typeof message === "string" && <span className="mt-1.5 block text-[10px] text-rose-600">{message}</span>}</label>; }
