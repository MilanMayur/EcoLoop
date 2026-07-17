import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in — EcoLoop", description: "Sign in to your EcoLoop waste operations workspace." };
export default function LoginPage() { return <AuthShell mode="login"><LoginForm /></AuthShell>; }
