import { notFound } from "next/navigation";
import { SmartStockModuleShell } from "@/components/smart-stock/navigation";

export default async function SmartStockLayout({ children, params }: { children: React.ReactNode; params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (role !== "vendor") notFound();
  return <SmartStockModuleShell>{children}</SmartStockModuleShell>;
}
