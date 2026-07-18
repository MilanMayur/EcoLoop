"use client";

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { analyticsService } from "@/services/analytics.service";
import { useAsyncResource } from "@/hooks/use-async-resource";

const tooltipStyle = { borderRadius: 12, border: "1px solid #E2E8F0", boxShadow: "0 12px 30px rgba(15,23,42,.08)", fontSize: 11 };

export function WasteTrendChart({ mode = "bar" }: { mode?: "bar" | "line" }) {
  const { data, loading, error } = useAsyncResource(() => analyticsService.getCharts(), "dashboard-charts");
  if (loading) return <ChartState label="Loading chart…" loading />;
  if (error || !data) return <ChartState label="Chart data is unavailable." error />;
  if (!data.wasteTrend.some((point) => point.collected > 0 || point.recycled > 0)) return <ChartState label="No measured pickup data yet." />;
  return (
    <div className="h-64 min-w-0 w-full" aria-label="Monthly waste collection and recycling chart">
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        {mode === "bar" ? <BarChart data={data.wasteTrend} margin={{ top: 10, right: 4, left: -22, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={.7} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94A3B8" }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94A3B8" }} /><Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#F1F5F9" }} /><Bar dataKey="collected" name="Collected (kg)" fill="#CBD5E1" radius={[5, 5, 0, 0]} /><Bar dataKey="recycled" name="Recycled (kg)" fill="#16A34A" radius={[5, 5, 0, 0]} /></BarChart> : <LineChart data={data.wasteTrend} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={.7} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94A3B8" }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94A3B8" }} /><Tooltip contentStyle={tooltipStyle} /><Line type="monotone" dataKey="collected" name="Collected (kg)" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3, fill: "#fff" }} /><Line type="monotone" dataKey="recycled" name="Recycled (kg)" stroke="#16A34A" strokeWidth={2.5} dot={{ r: 3, fill: "#fff" }} /></LineChart>}
      </ResponsiveContainer>
    </div>
  );
}

export function WasteDonutChart() {
  const { data, loading, error } = useAsyncResource(() => analyticsService.getCharts(), "dashboard-charts");
  if (loading) return <ChartState label="Loading chart…" loading />;
  if (error || !data) return <ChartState label="Chart data is unavailable." error />;
  if (!data.wasteCategories.length) return <ChartState label="No measured material data yet." />;
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row" aria-label="Waste category distribution chart">
      <div className="h-52 w-full min-w-0 flex-1"><ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}><PieChart><Pie data={data.wasteCategories} dataKey="value" nameKey="name" innerRadius={56} outerRadius={80} paddingAngle={3} stroke="none">{data.wasteCategories.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart></ResponsiveContainer></div>
      <div className="grid min-w-32 grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-1">{data.wasteCategories.map(item => <div key={item.name} className="flex items-center gap-2 text-xs text-slate-500"><span className="size-2 rounded-full" style={{ background: item.color }} /><span>{item.name}</span><span className="ml-auto font-semibold text-slate-700 dark:text-slate-200">{item.value}%</span></div>)}</div>
    </div>
  );
}

function ChartState({ label, error = false, loading = false }: { label: string; error?: boolean; loading?: boolean }) {
  return <div className={`grid h-64 place-items-center rounded-xl text-xs ${error ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10" : loading ? "animate-pulse bg-slate-50 text-slate-400 dark:bg-slate-800" : "bg-slate-50 text-slate-500 dark:bg-slate-800"}`}>{label}</div>;
}
