"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { analyticsService } from "@/services/analytics.service";
import { useAsyncResource } from "@/hooks/use-async-resource";

const tooltipStyle = { borderRadius: 12, border: "1px solid #E2E8F0", boxShadow: "0 12px 30px rgba(15,23,42,.08)", fontSize: 11 };

export function InventoryDemandChart() {
  const resource = useAsyncResource(() => analyticsService.getSmartStockAnalytics(), "smart-stock-charts");
  if (resource.loading || resource.error || !resource.data) return <ChartState error={Boolean(resource.error)} />;
  return <div className="h-72 min-w-0"><ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}><LineChart data={resource.data.inventoryDemand} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}><CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="3 3" opacity={.7} /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94A3B8" }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94A3B8" }} /><Tooltip contentStyle={tooltipStyle} /><Line type="monotone" dataKey="inventory" name="Inventory (kg)" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3, fill: "#fff" }} /><Line type="monotone" dataKey="demand" name="Demand (kg)" stroke="#16A34A" strokeWidth={2.5} dot={{ r: 3, fill: "#fff" }} /></LineChart></ResponsiveContainer></div>;
}

export function WasteReductionChart() {
  const resource = useAsyncResource(() => analyticsService.getSmartStockAnalytics(), "smart-stock-charts");
  if (resource.loading || resource.error || !resource.data) return <ChartState error={Boolean(resource.error)} />;
  return <div className="h-64 min-w-0"><ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}><BarChart data={resource.data.monthlyImpact} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}><CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="3 3" opacity={.7} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94A3B8" }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94A3B8" }} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="waste" name="Waste generated (kg)" fill="#CBD5E1" radius={[5,5,0,0]} /><Bar dataKey="prevented" name="Waste prevented (kg)" fill="#22C55E" radius={[5,5,0,0]} /></BarChart></ResponsiveContainer></div>;
}

export function SavingsAccuracyChart() {
  const resource = useAsyncResource(() => analyticsService.getSmartStockAnalytics(), "smart-stock-charts");
  if (resource.loading || resource.error || !resource.data) return <ChartState error={Boolean(resource.error)} />;
  return <div className="h-64 min-w-0"><ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}><LineChart data={resource.data.monthlyImpact} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}><CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="3 3" opacity={.7} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94A3B8" }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94A3B8" }} /><Tooltip contentStyle={tooltipStyle} /><Line type="monotone" dataKey="accuracy" name="Forecast accuracy (%)" stroke="#8B5CF6" strokeWidth={2.5} /><Line type="monotone" dataKey="savings" name="Savings (₹)" stroke="#16A34A" strokeWidth={2.5} /></LineChart></ResponsiveContainer></div>;
}

export function TopWasteChart() {
  const resource = useAsyncResource(() => analyticsService.getSmartStockAnalytics(), "smart-stock-charts");
  if (resource.loading || resource.error || !resource.data) return <ChartState error={Boolean(resource.error)} />;
  return <div className="h-64 min-w-0"><ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}><BarChart data={resource.data.topWaste} layout="vertical" margin={{ top: 4, right: 14, left: 6, bottom: 0 }}><CartesianGrid horizontal={false} stroke="#E2E8F0" strokeDasharray="3 3" opacity={.7} /><XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94A3B8" }} /><YAxis type="category" dataKey="product" width={72} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748B" }} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="potential" name="Potential waste (kg)" fill="#F59E0B" radius={[0,5,5,0]} /></BarChart></ResponsiveContainer></div>;
}

function ChartState({ error = false }: { error?: boolean }) {
  return <div className={`grid h-64 place-items-center rounded-xl text-xs ${error ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10" : "animate-pulse bg-slate-50 text-slate-400 dark:bg-slate-800"}`}>{error ? "Chart data is unavailable." : "Loading chart…"}</div>;
}
