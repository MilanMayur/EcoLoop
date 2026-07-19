import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { LanguageProvider } from "@/components/i18n/language-provider";
import { LANGUAGE_COOKIE, normalizeLocale } from "@/lib/i18n";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "EcoLoop — AI-Powered Smart Market Sustainability Platform",
  description: "EcoLoop helps vendors optimize inventory, prevent excess stock, reduce waste, and connect with BBMP and recycling partners in one intelligent ecosystem.",
  keywords: ["inventory forecasting", "circular economy", "waste management", "smart market", "BBMP", "recycling"],
  icons: {
    icon: [{ url: "/Logo.png", type: "image/png" }],
    apple: "/Logo.png",
  },
  openGraph: { title: "EcoLoop — Small Stock. Zero Waste. Smart Market.", description: "AI-powered inventory intelligence, circular waste recovery, and connected civic operations for smarter markets.", type: "website" },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const languageCookie = cookieStore.get(LANGUAGE_COOKIE)?.value;
  const locale = normalizeLocale(languageCookie);
  return (
    <html lang={locale} className="scroll-smooth" data-scroll-behavior="smooth">
      <body className={inter.variable} suppressHydrationWarning>
        <LanguageProvider initialLocale={locale} hasStoredPreference={Boolean(languageCookie)}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
