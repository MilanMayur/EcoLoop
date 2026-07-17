import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "EcoLoop — Smart Circular Waste Management",
  description: "EcoLoop connects vendors, civic bodies, and authorized recyclers to make market waste traceable, recyclable, and valuable.",
  keywords: ["circular economy", "waste management", "smart city", "BBMP", "recycling"],
  openGraph: { title: "EcoLoop — Small Stock. Zero Waste. Smart Market.", description: "The digital operating layer for cleaner, circular marketplaces.", type: "website" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="scroll-smooth"><body className={inter.variable}>{children}</body></html>;
}
