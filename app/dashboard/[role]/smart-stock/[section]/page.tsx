import { SmartStockPage } from "@/components/smart-stock/pages";
export default async function SmartStockSectionPage({ params }: { params: Promise<{ section: string }> }) { const { section } = await params; return <SmartStockPage section={section} />; }
