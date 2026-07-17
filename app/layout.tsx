import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "EcoLoop — AI-Powered Smart Market Sustainability Platform",
  description: "EcoLoop helps vendors optimize inventory, prevent excess stock, reduce waste, and connect with BBMP and recycling partners in one intelligent ecosystem.",
  keywords: ["inventory forecasting", "circular economy", "waste management", "smart market", "BBMP", "recycling"],
  openGraph: { title: "EcoLoop — Small Stock. Zero Waste. Smart Market.", description: "AI-powered inventory intelligence, circular waste recovery, and connected civic operations for smarter markets.", type: "website" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="scroll-smooth"><body className={inter.variable}>{children}</body></html>;
}
