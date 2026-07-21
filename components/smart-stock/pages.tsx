"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertTriangle, ArrowRight, BadgeIndianRupee, BrainCircuit,
  Check, ChevronRight, CircleDollarSign, Edit3,
  IndianRupee, Leaf, Package, PackageCheck, Plus, Recycle,
  Send, ShoppingBasket, Sparkles, Store, Tag, Target, TrendingDown, TrendingUp,
  Trash2, X,
} from "lucide-react";
import { Reveal } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Panel, StatusBadge } from "@/components/dashboard/primitives";
import { EcoLoopAIScore } from "@/components/smart-stock/score";
import { InventoryDemandChart, SavingsAccuracyChart, TopWasteChart, WasteReductionChart } from "@/components/smart-stock/charts";
import { cn } from "@/lib/utils";
import type { StockProduct } from "@/types/dashboard";
import { inventoryService } from "@/services/inventory.service";
import { analyticsService } from "@/services/analytics.service";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { includesSearch, paginate } from "@/utils/table";
import { aiService } from "@/services/ai.service";
import { useDashboardProfile } from "@/components/dashboard/profile-context";

const inputClass = "mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:text-sm";
const labelClass = "text-xs font-semibold text-slate-700 dark:text-slate-300";

const inventorySchema = z.object({
  name: z.string().min(2, "Enter a product name."),
  stock: z.coerce.number().positive("Stock must be greater than zero."),
  unit: z.enum(["kg", "crate"]),
  expiry: z.string().min(1, "Choose an expiry date."),
  price: z.coerce.number().positive("Selling price must be greater than zero."),
});

type InventoryInputValues = z.input<typeof inventorySchema>;
type InventoryValues = z.output<typeof inventorySchema>;

export function SmartStockPage({ section }: { section: string }) {
  if (section === "dashboard") return <StockDashboard />;
  if (section === "inventory") return <InventoryPage />;
  if (section === "forecast") return <ForecastPage />;
  if (section === "alerts") return <AlertsPage />;
  if (section === "analytics") return <StockAnalyticsPage />;
  if (section === "advisor") return <AdvisorPage />;
  if (section === "impact") return <ImpactPage />;
  return <Panel><div className="p-14 text-center"><Package className="mx-auto size-7 text-slate-400" /><h1 className="mt-4 text-sm font-semibold">Smart Stock page not found</h1></div></Panel>;
}

function StockDashboard() {
  const resource = useAsyncResource(() => inventoryService.getInventory(), "stock-dashboard");
  const products = resource.data ?? [];
  const kilogramProducts = products.filter((item) => item.unit === "kg");
  const totalStock = kilogramProducts.reduce((sum, item) => sum + item.stock, 0);
  const forecastDemand = kilogramProducts.reduce((sum, item) => sum + item.forecast, 0);
  const productsAboveForecast = products.filter((item) => item.stock > item.forecast);
  const potentialWaste = kilogramProducts.reduce((sum, item) => sum + Math.max(0, item.stock - item.forecast), 0);
  const valueAtRisk = products.reduce((sum, item) => sum + Math.max(0, item.stock - item.forecast) * item.price, 0);
  const efficiency = totalStock > 0 ? Math.max(0, Math.round((1 - potentialWaste / totalStock) * 100)) : 0;
  const sellThrough = totalStock > 0 ? Math.min(100, Math.round((forecastDemand / totalStock) * 100)) : 0;
  const priority = [...productsAboveForecast].sort(
    (a, b) => (b.stock - b.forecast) * b.price - (a.stock - a.forecast) * a.price,
  )[0];
  const priorityExcess = priority ? priority.stock - priority.forecast : 0;
  const priorityValue = priority ? Math.round(priorityExcess * priority.price) : 0;
  const formatNumber = (value: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value);
  const large = [
    { label: "Current inventory", value: `${formatNumber(totalStock)} kg`, detail: `Across ${kilogramProducts.length} kilogram-based products`, icon: Package, tone: "green" },
    { label: "Forecast demand", value: `${formatNumber(forecastDemand)} kg`, detail: `${sellThrough}% of current kilogram stock`, icon: TrendingUp, tone: "blue" },
    { label: "Potential excess", value: `${formatNumber(potentialWaste)} kg`, detail: `${productsAboveForecast.length} products above forecast`, icon: AlertTriangle, tone: "amber" },
    { label: "Value at risk", value: `₹${new Intl.NumberFormat("en-IN").format(Math.round(valueAtRisk))}`, detail: "Excess quantity × stored selling price", icon: BadgeIndianRupee, tone: "violet" },
  ];
  const small = [["Products monitored", String(products.length)], ["High-risk items", String(products.filter((item) => item.risk === "High").length)], ["Inventory efficiency", `${efficiency}%`], ["Items above forecast", String(productsAboveForecast.length)]];
  const toneStyles: Record<string,string> = { green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400", blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400", amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400", violet: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400" };
  return <div className="space-y-3 sm:space-y-6"><PageHeader eyebrow="Smart Stock · Today" title="Inventory intelligence" description="See what is likely to sell, what may become waste, and where to act before closing time." /><EcoLoopAIScore />{resource.loading ? <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-4">{Array.from({length:4},(_,index)=><div key={index} className="h-36 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}</div> : resource.error ? <Panel><div className="p-5 text-center text-xs text-rose-600 sm:p-8">Inventory dashboard data is temporarily unavailable.</div></Panel> : <><div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-4">{large.map((item,index) => <Reveal key={item.label} delay={index*.05} className="rounded-xl border border-slate-200 bg-white p-3 shadow-[0_8px_28px_rgba(15,23,42,.04)] dark:border-slate-800 dark:bg-slate-900 sm:rounded-2xl sm:p-5"><div className="flex items-start justify-between"><span className={cn("grid size-9 place-items-center rounded-lg sm:size-10 sm:rounded-xl", toneStyles[item.tone])}><item.icon className="size-[18px]" /></span><span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Live</span></div><p className="mt-3 text-lg font-semibold tracking-[-.04em] sm:mt-6 sm:text-2xl">{item.value}</p><p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">{item.label}</p><p className="mt-2 text-[9px] leading-4 text-slate-400 sm:mt-4 sm:text-[10px]">{item.detail}</p></Reveal>)}</div><div className="grid grid-cols-2 gap-2 xl:grid-cols-4">{small.map(([label,value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white px-2.5 py-2.5 sm:px-4 sm:py-3.5 dark:border-slate-800 dark:bg-slate-900"><p className="text-lg font-semibold tracking-tight">{value}</p><p className="mt-1 text-[10px] text-slate-400">{label}</p></div>)}</div><div className="grid gap-3 sm:gap-5 xl:grid-cols-[1.4fr_.6fr]"><Panel title="Inventory vs demand" subtitle="Current stock compared with current forecast"><div className="p-2.5 sm:p-6"><InventoryDemandChart /></div></Panel><Panel title="Today’s priority" subtitle="Highest current value at risk"><div className="p-3 sm:p-5">{priority ? <><div className="rounded-xl bg-amber-50 p-3 sm:rounded-2xl sm:p-5 dark:bg-amber-500/10"><span className="grid size-9 place-items-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 sm:size-10 sm:rounded-xl"><AlertTriangle className="size-[18px]" /></span><p className="mt-3 text-sm font-semibold text-amber-950 dark:text-amber-100 sm:mt-5">{priority.name} is {formatNumber(priorityExcess)} {priority.unit} above forecast</p><p className="mt-2 text-xs leading-5 text-amber-800 dark:text-amber-300">Current stock is {formatNumber(priority.stock)} {priority.unit}; forecast demand is {formatNumber(priority.forecast)} {priority.unit}. Stored value at risk: ₹{new Intl.NumberFormat("en-IN").format(priorityValue)}.</p><Button asChild size="sm" className="mt-3 sm:mt-5"><Link href="/dashboard/vendor/smart-stock/alerts">View recommendation <ArrowRight className="size-3.5" /></Link></Button></div><div className="mt-4 flex items-center justify-between rounded-xl border border-slate-100 p-3 dark:border-slate-800"><div className="flex items-center gap-2"><Target className="size-4 text-emerald-600" /><span className="text-[10px] font-medium">Products above forecast</span></div><span className="text-xs font-semibold">{productsAboveForecast.length}</span></div></> : <EmptyState icon={<Check className="size-5" />} title="No priority action" description="No inventory item is currently above its stored forecast." />}</div></Panel></div></>}</div>;
}

function InventoryPage() {
  const resource = useAsyncResource(() => inventoryService.getInventory(), "inventory");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StockProduct | null>(null);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [risk, setRisk] = useState("All risk levels");
  const [sort, setSort] = useState("Name A–Z");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InventoryInputValues, unknown, InventoryValues>({
    resolver: zodResolver(inventorySchema),
    defaultValues: { name: "", stock: 1, unit: "kg", expiry: "", price: 1 },
  });
  const products = useMemo(
    () =>
      (resource.data ?? [])
        .filter((item) => includesSearch([item.name, item.id], search))
        .filter((item) => risk === "All risk levels" || `${item.risk} risk` === risk)
        .sort((a, b) =>
          sort === "Name A–Z"
            ? a.name.localeCompare(b.name)
            : sort === "Stock high–low"
              ? b.stock - a.stock
              : b.risk.localeCompare(a.risk),
        ),
    [resource.data, risk, search, sort],
  );
  const pageInfo = paginate(products, page, 6);
  const openCreate = () => {
    setEditing(null);
    reset({ name: "", stock: 1, unit: "kg", expiry: "", price: 1 });
    setError("");
    setOpen(true);
  };
  const openEdit = (product: StockProduct) => {
    setEditing(product);
    reset({
      name: product.name,
      stock: product.stock,
      unit: product.unit,
      expiry: product.expiry,
      price: product.price,
    });
    setError("");
    setOpen(true);
  };
  const submit = async (values: InventoryValues) => {
    setError("");
    try {
      const product = editing
        ? await inventoryService.updateInventory(editing.id, values)
        : await inventoryService.createInventory(values);
      resource.setData(
        editing
          ? (resource.data ?? []).map((item) => item.id === product.id ? product : item)
          : [product, ...(resource.data ?? [])],
      );
      setOpen(false);
      setToast(`${product.name} ${editing ? "updated" : "added"} in Smart Stock.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The inventory item could not be saved.");
    }
  };
  const remove = async (product: StockProduct) => {
    try {
      await inventoryService.deleteInventory(product.id);
      resource.setData((resource.data ?? []).filter((item) => item.id !== product.id));
      setToast(`${product.name} removed from Smart Stock.`);
    } catch (reason) {
      setToast(reason instanceof Error ? reason.message : "The product could not be removed.");
    }
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      <PageHeader
        eyebrow="Smart Stock"
        title="Inventory management"
        description="Keep today’s stock current so recommendations stay accurate and useful."
        action={<Button onClick={openCreate}><Plus className="size-4" /> Add product</Button>}
      />
      <Panel>
        <div className="grid grid-cols-2 gap-1.5 border-b border-slate-100 p-2.5 dark:border-slate-800 sm:flex sm:gap-3 sm:p-4">
          <input aria-label="Search inventory" value={search} onChange={(event) => setSearch(event.target.value)} className={`${inputClass} col-span-2 mt-0 h-10 text-sm sm:max-w-xs`} placeholder="Search products…" />
          <select aria-label="Filter inventory risk" value={risk} onChange={(event) => setRisk(event.target.value)} className={`${inputClass} mt-0 h-10 text-sm sm:ml-auto sm:w-40`}><option>All risk levels</option><option>High risk</option><option>Medium risk</option><option>Low risk</option></select>
          <select aria-label="Sort inventory" value={sort} onChange={(event) => setSort(event.target.value)} className={`${inputClass} mt-0 h-10 text-sm sm:w-40`}><option>Name A–Z</option><option>Stock high–low</option><option>Risk high–low</option></select>
        </div>
        {resource.loading ? (
          <div className="h-40 animate-pulse bg-slate-50 dark:bg-slate-900 sm:h-64" />
        ) : resource.error ? (
          <div className="p-5 text-center sm:p-8">
            <p className="text-[11px] text-rose-600 sm:text-xs">{resource.error}</p>
            <Button size="sm" variant="outline" className="mt-3 sm:mt-4" onClick={resource.reload}>Try again</Button>
          </div>
        ) : pageInfo.rows.length ? (
          <>
            <div className="grid gap-1.5 p-2 sm:hidden">
              {pageInfo.rows.map((item) => (
                <article key={item.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 dark:border-slate-800 dark:bg-slate-950/50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"><ShoppingBasket className="size-3.5" /></span>
                      <div className="min-w-0"><h2 className="truncate text-xs font-semibold">{item.name}</h2><p className="mt-0.5 text-[9px] text-slate-400">₹{item.price}/{item.unit}</p></div>
                    </div>
                    <StatusBadge status={item.risk} />
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1.5 rounded-lg bg-white p-2 text-[10px] dark:bg-slate-900">
                    <div><p className="text-slate-400">Current</p><p className="mt-0.5 font-semibold">{item.stock} {item.unit}</p></div>
                    <div><p className="text-slate-400">Forecast</p><p className="mt-0.5 font-semibold">{item.forecast} {item.unit}</p></div>
                    <div><p className="text-slate-400">Expiry</p><p className="mt-0.5 truncate font-semibold">{item.expiry}</p></div>
                  </div>
                  <div className="mt-1.5 flex justify-end gap-1 border-t border-slate-100 pt-2 dark:border-slate-800">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(item)}><Edit3 className="size-3.5" /> Edit</Button>
                    <Button size="sm" variant="ghost" aria-label={`Delete ${item.name}`} onClick={() => void remove(item)}><Trash2 className="size-3.5 text-rose-500" /></Button>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[960px] text-left">
                <thead><tr className="border-b border-slate-100 text-[9px] uppercase tracking-wider text-slate-400 dark:border-slate-800">{["Product", "Current stock", "Unit", "Expiry", "Selling price", "Demand forecast", "Risk", "Actions"].map((heading) => <th className="px-5 py-3 font-semibold" key={heading}>{heading}</th>)}</tr></thead>
                <tbody>{pageInfo.rows.map((item) => <tr key={item.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"><ShoppingBasket className="size-4" /></span><span className="text-xs font-semibold">{item.name}</span></div></td><td className="px-5 py-4 text-xs font-semibold">{item.stock}</td><td className="px-5 py-4 text-xs text-slate-500">{item.unit}</td><td className="px-5 py-4 text-xs text-slate-500">{item.expiry}</td><td className="px-5 py-4 text-xs text-slate-500">₹{item.price}/{item.unit}</td><td className="px-5 py-4 text-xs"><span className="font-semibold">{item.forecast} {item.unit}</span><div className="mt-2 h-1 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(item.forecast / item.stock * 100, 100)}%` }} /></div></td><td className="px-5 py-4"><StatusBadge status={item.risk} /></td><td className="px-5 py-4"><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => openEdit(item)}><Edit3 className="size-3.5" /> Edit</Button><Button size="sm" variant="ghost" aria-label={`Delete ${item.name}`} onClick={() => void remove(item)}><Trash2 className="size-3.5 text-rose-500" /></Button></div></td></tr>)}</tbody>
              </table>
            </div>
            <div className="flex flex-col gap-2 border-t border-slate-100 px-3 py-2.5 text-[10px] text-slate-400 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
              <span>{pageInfo.total} products</span>
              <div className="flex items-center justify-between gap-2 sm:justify-end"><Button size="sm" variant="outline" disabled={pageInfo.page === 1} onClick={() => setPage(pageInfo.page - 1)}>Previous</Button><span>Page {pageInfo.page} of {pageInfo.totalPages}</span><Button size="sm" variant="outline" disabled={pageInfo.page === pageInfo.totalPages} onClick={() => setPage(pageInfo.page + 1)}>Next</Button></div>
            </div>
          </>
        ) : (
          <EmptyState icon={<Package className="size-5" />} title="No products found" description="Try a different search or risk filter." />
        )}
      </Panel>
      {open && (
        <div className="fixed inset-0 z-[70] grid place-items-end bg-slate-950/40 p-0 backdrop-blur-sm sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="add-product-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <form onSubmit={handleSubmit(submit)} className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:max-w-lg sm:rounded-[1.75rem] sm:p-6" noValidate>
            <div className="flex items-start justify-between"><div><p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 sm:text-[10px]">Inventory</p><h2 id="add-product-title" className="mt-1 text-lg font-semibold tracking-[-.035em] sm:text-xl">{editing ? "Edit product" : "Add a product"}</h2></div><Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Close dialog"><X className="size-4" /></Button></div>
            <div className="mt-3 grid gap-2.5 sm:mt-6 sm:grid-cols-2 sm:gap-4"><label className={labelClass}>Product name<input {...register("name")} placeholder="e.g. Carrots" className={`${inputClass} mt-1.5 h-10 text-sm sm:mt-2 sm:h-11`} />{errors.name && <span className="mt-1 block text-[10px] text-rose-600">{errors.name.message}</span>}</label><label className={labelClass}>Current stock<input {...register("stock")} type="number" placeholder="e.g. 12" className={`${inputClass} mt-1.5 h-10 text-sm sm:mt-2 sm:h-11`} />{errors.stock && <span className="mt-1 block text-[10px] text-rose-600">{errors.stock.message}</span>}</label><label className={labelClass}>Unit<select {...register("unit")} className={`${inputClass} mt-1.5 h-10 text-sm sm:mt-2 sm:h-11`}><option value="kg">Kilograms</option><option value="crate">Crates</option></select></label><label className={labelClass}>Expiry date<input {...register("expiry")} type="date" className={`${inputClass} mt-1.5 h-10 text-sm sm:mt-2 sm:h-11`} />{errors.expiry && <span className="mt-1 block text-[10px] text-rose-600">{errors.expiry.message}</span>}</label><label className={labelClass}>Selling price (₹)<input {...register("price")} type="number" placeholder="e.g. 32" className={`${inputClass} mt-1.5 h-10 text-sm sm:mt-2 sm:h-11`} />{errors.price && <span className="mt-1 block text-[10px] text-rose-600">{errors.price.message}</span>}</label></div>
            {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2.5 text-[11px] text-rose-700 sm:mt-5 sm:px-4 sm:py-3 sm:text-xs">{error}</p>}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-7 sm:flex sm:justify-end"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save product"}</Button></div>
          </form>
        </div>
      )}
      {toast && <Toast message={toast} close={() => setToast("")} />}
    </div>
  );
}
function ForecastPage() {
  const resource = useAsyncResource(() => inventoryService.getForecasts(), "stock-forecasts");
  const forecasts = resource.data ?? [];
  const planned = forecasts.reduce((sum, item) => sum + item.planned, 0);
  const recommended = forecasts.reduce((sum, item) => sum + item.recommended, 0);
  const reduction = Math.max(0, planned - recommended);
  return <div className="space-y-3 sm:space-y-6"><PageHeader eyebrow="EcoLoop intelligence" title="Demand forecast" description="Plan tomorrow’s purchases from the forecast values stored with your inventory." />{!resource.loading && !resource.error && <Reveal className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-500/10 sm:rounded-[1.75rem] sm:p-8"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center sm:gap-6"><div><div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400"><BrainCircuit className="size-4" /> Current recommendation</div><h2 className="mt-1.5 max-w-2xl text-lg font-semibold tracking-[-.045em] text-emerald-950 dark:text-emerald-50 sm:mt-3 sm:text-3xl">{forecasts.length ? `Plan ${reduction} kg less than current inventory.` : "Add inventory to generate recommendations."}</h2><p className="mt-1.5 text-[11px] leading-4 text-emerald-800 dark:text-emerald-300 sm:mt-3 sm:text-sm">{forecasts.length ? `Calculated from ${forecasts.length} current inventory records in Supabase.` : "No forecast values are available yet."}</p></div><div className="shrink-0 rounded-xl bg-white px-3 py-2 text-center shadow-sm dark:bg-slate-900 sm:rounded-2xl sm:p-5"><p className="text-2xl font-semibold tracking-[-.05em] text-slate-950 dark:text-white">{forecasts.length}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Products assessed</p></div></div></Reveal>}{resource.loading ? <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">{Array.from({length:3},(_,index)=><div key={index} className="h-48 animate-pulse rounded-xl bg-white dark:bg-slate-900" />)}</div> : resource.error ? <Panel><div className="p-5 text-center text-xs text-rose-600 sm:p-8">Forecast data is temporarily unavailable.</div></Panel> : forecasts.length ? <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">{forecasts.map(item => { const itemReduction=item.planned-item.recommended; return <Panel key={item.product}><div className="p-3 sm:p-5"><div className="flex items-center justify-between"><span className="grid size-8 place-items-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 sm:size-10 sm:rounded-xl"><ShoppingBasket className="size-[18px]" /></span><span className="text-[10px] font-semibold text-slate-400">Stored forecast</span></div><h2 className="mt-2 text-sm font-semibold sm:mt-5 sm:text-base">{item.product}</h2><div className="mt-2.5 space-y-1.5 sm:mt-5 sm:space-y-3">{[["Expected demand",`${item.expected} kg`],["Recommended purchase",`${item.recommended} kg`],["Current inventory",`${item.planned} kg`]].map(([k,v],i) => <div key={k} className="flex items-center justify-between text-xs"><span className="text-slate-500">{k}</span><span className={cn("font-semibold",i===1&&"text-emerald-600")}>{v}</span></div>)}</div><div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 sm:mt-5"><div className="h-full rounded-full bg-emerald-500" style={{width:`${item.planned > 0 ? Math.min(100, item.recommended/item.planned*100) : 0}%`}} /></div><div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[10px] font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-400"><TrendingDown className="size-3.5" /> {itemReduction > 0 ? `Reduce by ${itemReduction} kg` : "No reduction indicated"}</div></div></Panel>; })}</div> : <Panel><EmptyState icon={<Package className="size-5" />} title="No forecast data" description="Add inventory items to see product-level forecasts." /></Panel>}</div>;
}

function AlertsPage() {
  const [toast,setToast]=useState("");
  const resource = useAsyncResource(() => inventoryService.getAlerts(), "stock-alerts");
  const actions=[{i:Tag,t:"Offer evening discount"},{i:Store,t:"Transfer to nearby vendor"},{i:CircleDollarSign,t:"Donate unsold food"},{i:Recycle,t:"Send to composting"}];
  const act = async (product:string, action:string) => { try { await inventoryService.resolveAlert(product, action); setToast(`${action} created for ${product}.`); } catch (reason) { setToast(reason instanceof Error ? reason.message : "The action could not be created."); } };
  const alerts = resource.data ?? [];
  return <div className="space-y-3 sm:space-y-6"><PageHeader eyebrow="Waste prevention" title="Overstock alerts" description="Act on inventory risk while products still have value and useful destinations." />{resource.loading ? <div className="grid gap-3 sm:gap-5 xl:grid-cols-2">{Array.from({length:3},(_,index)=><div key={index} className="h-56 animate-pulse rounded-xl bg-white dark:bg-slate-900" />)}</div> : resource.error ? <Panel><div className="p-5 text-center text-xs text-rose-600 sm:p-8">Alert data is temporarily unavailable.</div></Panel> : alerts.length ? <div className="grid gap-3 sm:gap-5 xl:grid-cols-2">{alerts.map((alert,index) => <Reveal key={alert.product} delay={index*.06} className="rounded-xl border border-amber-200 bg-white p-3 shadow-[0_8px_28px_rgba(15,23,42,.04)] dark:border-amber-900 dark:bg-slate-900 sm:rounded-[1.5rem] sm:p-6"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"><AlertTriangle className="size-4" /></span><div><p className="text-[9px] font-bold uppercase tracking-[.14em] text-amber-600">{alert.severity} overstock risk</p><h2 className="mt-1 text-base font-semibold">{alert.product}</h2></div></div><span className="text-[10px] font-semibold text-amber-700">₹{alert.value} at risk</span></div><div className="mt-3 grid grid-cols-3 rounded-lg bg-slate-50 p-2.5 sm:mt-6 sm:p-4 dark:bg-slate-950">{[["Inventory",`${alert.stock} kg`],["Expected sales",`${alert.sales} kg`],["Possible waste",`${alert.waste} kg`]].map(([k,v]) => <div key={k}><p className="text-[9px] uppercase tracking-wider text-slate-400">{k}</p><p className="mt-1 text-sm font-semibold">{v}</p></div>)}</div><p className="mt-3 text-[9px] font-bold uppercase sm:mt-6 tracking-wider text-slate-400">Suggested actions</p><div className="mt-2 grid grid-cols-2 gap-1.5 sm:mt-3 sm:gap-2">{actions.map(action => <button key={action.t} onClick={() => act(alert.product, action.t)} className="flex items-center gap-1.5 rounded-lg border border-slate-200 p-2 text-left text-[9px] sm:gap-2 sm:rounded-xl sm:p-3 sm:text-[10px] font-semibold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-emerald-500/10"><action.i className="size-3.5" />{action.t}<ChevronRight className="ml-auto size-3" /></button>)}</div></Reveal>)}</div> : <Panel><EmptyState icon={<Check className="size-5" />} title="No overstock alerts" description="Inventory risk is currently within your targets." /></Panel>}{toast&&<Toast message={toast} close={()=>setToast("")} />}</div>;
}

function StockAnalyticsPage() {
  const resource = useAsyncResource(() => inventoryService.getInventory(), "stock-analytics-summary");
  const products = resource.data ?? [];
  const kilogramProducts = products.filter((item) => item.unit === "kg");
  const currentStock = kilogramProducts.reduce((sum, item) => sum + item.stock, 0);
  const forecastDemand = kilogramProducts.reduce((sum, item) => sum + item.forecast, 0);
  const potentialExcess = kilogramProducts.reduce((sum, item) => sum + Math.max(0, item.stock - item.forecast), 0);
  const valueAtRisk = products.reduce((sum, item) => sum + Math.max(0, item.stock - item.forecast) * item.price, 0);
  const number = (value:number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value);
  const summaries=[["Current inventory",`${number(currentStock)} kg`,Package],["Forecast demand",`${number(forecastDemand)} kg`,TrendingUp],["Potential excess",`${number(potentialExcess)} kg`,AlertTriangle],["Value at risk",`₹${new Intl.NumberFormat("en-IN").format(Math.round(valueAtRisk))}`,IndianRupee]] as const;
  return <div className="space-y-3 sm:space-y-6"><PageHeader eyebrow="Smart Stock intelligence" title="Inventory analytics" description="Current values come directly from your Supabase inventory. Historical panels remain empty until outcomes are recorded." />{resource.loading ? <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-4">{Array.from({length:4},(_,index)=><div key={index} className="h-28 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}</div> : resource.error ? <Panel><div className="p-5 text-center text-xs text-rose-600 sm:p-8">Inventory analytics are temporarily unavailable.</div></Panel> : <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-4">{summaries.map(([label,value,Icon]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:rounded-2xl sm:p-5"><Icon className="size-[18px] text-emerald-600" /><p className="mt-2 text-lg font-semibold tracking-[-.04em] sm:mt-5 sm:text-2xl">{value}</p><p className="mt-0.5 text-[10px] text-slate-500 sm:mt-1 sm:text-xs">{label}</p></div>)}</div>}<div className="grid gap-3 sm:gap-5 xl:grid-cols-2"><Panel title="Inventory vs forecast" subtitle="Current Supabase inventory snapshot"><div className="p-2.5 sm:p-6"><InventoryDemandChart /></div></Panel><Panel title="Waste reduction history" subtitle="Shown after inventory outcomes are recorded"><div className="p-2.5 sm:p-6"><WasteReductionChart /></div></Panel><Panel title="Forecast outcome history" subtitle="Accuracy requires actual outcome records"><div className="p-2.5 sm:p-6"><SavingsAccuracyChart /></div></Panel><Panel title="Top potential excess" subtitle="Current products above forecast"><div className="p-2.5 sm:p-6"><TopWasteChart /></div></Panel></div></div>;
}

function AdvisorPage() {
  const profile = useDashboardProfile();
  const [messages,setMessages]=useState<string[]>([]);
  const [input,setInput]=useState("");
  const [thinking,setThinking]=useState(false);
  const insightsResource = useAsyncResource(async () => { const inventory = await inventoryService.getInventory(); const analysis = await aiService.analyzeInventory({ inventory }); return [...analysis.purchaseRecommendations, ...analysis.wastePreventionTips].slice(0, 4); }, "advisor-insights");
  const ask=async(text:string)=>{if(!text.trim()||thinking)return;const history=messages.slice(-8).map((content,index)=>({role:(index%2===0?"user":"assistant") as "user"|"assistant",content}));setMessages(current=>[...current,text]);setInput("");setThinking(true);try{const inventory=await inventoryService.getInventory();const result=await aiService.chatAssistant("vendor",text,history,{inventory});setMessages(current=>[...current,result.reply]);}catch{setMessages(current=>[...current,"The advisor is temporarily unavailable. Please try again."]);}finally{setThinking(false);}};
  const insights=insightsResource.data ?? [];
  return <div className="space-y-3 sm:space-y-6"><PageHeader eyebrow="EcoLoop intelligence" title="AI Stock Advisor" description="A practical sustainability assistant grounded in your inventory and sales signals." /><Panel className="overflow-hidden"><div className="border-b border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950 sm:p-5"><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg sm:size-10 sm:rounded-xl bg-slate-950 text-emerald-400 dark:bg-emerald-600 dark:text-white"><BrainCircuit className="size-[18px]" /></span><div><h2 className="text-sm font-semibold">EcoLoop AI Advisor</h2><p className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400"><span className="size-1.5 rounded-full bg-emerald-500" /> {insightsResource.loading ? "Loading today’s insights…" : "Ready with today’s insights"}</p></div></div></div><div className="mx-auto max-w-3xl p-2.5 sm:p-8"><div className="flex items-start gap-2"><span className="grid size-7 shrink-0 sm:size-8 place-items-center rounded-lg bg-emerald-600 text-white"><Sparkles className="size-3.5" /></span><div className="rounded-xl rounded-tl-sm bg-slate-100 p-2.5 sm:rounded-2xl sm:p-4 dark:bg-slate-800"><p className="text-xs font-semibold">Hello, {profile?.name || profile?.organization || "EcoLoop user"}. Here’s what needs attention today.</p>{insightsResource.error ? <p className="mt-4 text-xs text-rose-600">Insights are temporarily unavailable.</p> : <div className="mt-2.5 space-y-1.5 sm:mt-4 sm:space-y-3">{insights.map((text,index)=><div key={text} className="flex gap-2.5 text-xs leading-5 text-slate-600 dark:text-slate-300"><span className="mt-1 grid size-4 shrink-0 place-items-center rounded-full bg-emerald-100 text-[8px] font-bold text-emerald-700 dark:bg-emerald-500/10">{index+1}</span>{text}</div>)}</div>}</div></div>{messages.map((message,index)=><div key={`${message}-${index}`} className={cn("mt-3 flex gap-2 sm:mt-5 sm:gap-3",index%2===0?"justify-end":"justify-start")}><div className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-5",index%2===0?"rounded-tr-sm bg-emerald-600 text-white":"rounded-tl-sm bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200")}>{message}</div></div>)}{thinking&&<p className="mt-5 text-[10px] text-slate-400">EcoLoop Advisor is preparing a recommendation…</p>}<div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 sm:mt-8 sm:flex-wrap sm:gap-2 sm:overflow-visible sm:pb-0">{["What should I discount?","Plan tomorrow’s purchase","How can I prevent waste?"].map(q=><button key={q} disabled={thinking} onClick={()=>ask(q)} className="shrink-0 rounded-full border border-slate-200 px-2.5 py-1.5 text-[9px] sm:px-3 sm:py-2 sm:text-[10px] font-medium text-slate-500 hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-wait disabled:opacity-50 dark:border-slate-700">{q}</button>)}</div><form onSubmit={event=>{event.preventDefault();ask(input);}} className="mt-3 flex gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5 sm:mt-4 sm:gap-2 sm:rounded-2xl sm:p-2 focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950"><input value={input} onChange={event=>setInput(event.target.value)} aria-label="Ask EcoLoop AI Advisor" placeholder="Ask about inventory, demand, or waste…" className="min-w-0 flex-1 bg-transparent px-2.5 text-xs outline-none sm:px-3" /><Button size="icon" type="submit" disabled={thinking||!input.trim()} aria-label="Send message"><Send className="size-4" /></Button></form><p className="mt-3 text-center text-[9px] text-slate-400">AI recommendations are estimates based on your current inventory data.</p></div></Panel></div>;
}

function ImpactPage() {
  const resource = useAsyncResource(() => analyticsService.getDashboard("vendor"), "vendor-impact");
  const data = resource.data;
  const collected = data?.wasteTrend.reduce((sum, item) => sum + item.collected, 0) ?? 0;
  const recovered = data?.wasteTrend.reduce((sum, item) => sum + item.recycled, 0) ?? 0;
  const recyclingRate = collected > 0 ? Math.min(100, Math.round(recovered / collected * 100)) : 0;
  const categories = data?.wasteCategories ?? [];
  const metrics=[{label:"Waste collected",value:`${collected} kg`,icon:Recycle},{label:"Waste recovered",value:`${recovered} kg`,icon:Leaf},{label:"Recycling rate",value:`${recyclingRate}%`,icon:TrendingUp},{label:"Recorded materials",value:String(categories.length),icon:PackageCheck}];
  return <div className="space-y-3 sm:space-y-6"><PageHeader eyebrow="Measured outcomes" title="Sustainability impact" description="Calculated only from completed pickups with recycler-recorded actual weight during the last six months." />{resource.loading ? <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-4">{Array.from({length:4},(_,index)=><div key={index} className="h-28 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}</div> : resource.error ? <Panel><div className="p-5 text-center text-xs text-rose-600 sm:p-8">Sustainability impact is temporarily unavailable.</div></Panel> : <><div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-4">{metrics.map((item,index)=><Reveal key={item.label} delay={index*.05} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:rounded-2xl sm:p-5"><item.icon className="size-[18px] text-emerald-600" /><p className="mt-2 text-lg font-semibold tracking-[-.04em] sm:mt-5 sm:text-2xl">{item.value}</p><p className="mt-1 text-[10px] text-slate-500">{item.label}</p></Reveal>)}</div><div className="grid gap-3 sm:gap-5 xl:grid-cols-[1.35fr_.65fr]"><Panel title="Measured pickup history" subtitle="Actual collected and recovered kilograms"><div className="p-3 text-xs text-slate-500 sm:p-6">{collected > 0 ? `${collected} kg collected and ${recovered} kg recovered in the recorded six-month window.` : "No completed pickup weight has been recorded yet."}</div></Panel><Panel title="Material distribution" subtitle="Share of measured completed pickups"><div className="space-y-2.5 p-3 sm:space-y-5 sm:p-6">{categories.length ? categories.map((item)=><div key={item.name}><div className="flex justify-between text-[10px]"><span className="capitalize text-slate-500">{item.name}</span><span className="font-semibold">{item.value}%</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full" style={{width:`${item.value}%`,background:item.color}} /></div></div>) : <p className="py-8 text-center text-xs text-slate-500">No measured completed pickup data yet.</p>}</div></Panel></div><Reveal className="flex flex-col items-start justify-between gap-2.5 rounded-xl bg-emerald-600 p-3 text-white sm:flex-row sm:items-center sm:gap-5 sm:rounded-[1.5rem] sm:p-8"><div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-emerald-100">Recorded impact</p><h2 className="mt-1.5 text-lg font-semibold tracking-[-.04em] sm:mt-2 sm:text-2xl">{recovered > 0 ? `${recovered} kg of measured waste was recovered.` : "No recovered waste has been recorded yet."}</h2><p className="mt-1 text-[11px] leading-4 text-emerald-50 sm:mt-2 sm:text-sm">This total uses recycler-entered actual pickup weights only.</p></div><Button asChild variant="outline" className="w-full border-white/30 bg-white text-emerald-700 hover:bg-emerald-50 sm:w-auto"><Link href="/dashboard/vendor/smart-stock/analytics">View inventory analytics</Link></Button></Reveal></>}</div>;
}
function Toast({message,close}:{message:string;close:()=>void}) { return <div role="status" className="fixed bottom-24 right-3 z-[80] max-w-[calc(100vw-1.5rem)] sm:bottom-5 sm:right-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-2xl dark:border-emerald-900 dark:bg-slate-900"><span className="grid size-7 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="size-3.5" /></span><p className="text-xs font-medium">{message}</p><button onClick={close} className="ml-2 text-slate-400">×</button></div>; }
