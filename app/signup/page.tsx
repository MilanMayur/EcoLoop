import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Create account — EcoLoop", description: "Join EcoLoop as a vendor, recycling partner, or BBMP officer." };
export default function SignupPage() { return <AuthShell mode="signup"><SignupForm /></AuthShell>; }
