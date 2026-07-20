"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  MapPin,
  Navigation,
  Plus,
  Recycle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  WasteDonutChart,
  WasteTrendChart,
} from "@/components/dashboard/charts";
import {
  MetricCard,
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/dashboard/primitives";
import type { DashboardRole } from "@/types/dashboard";
import type {
  DashboardAnalytics,
  MarketSummary,
  PickupJob,
  PickupRequest,
} from "@/types/mvp";
import { analyticsService } from "@/services/analytics.service";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { DashboardAIInsights } from "@/components/ai/dashboard-insights";
import { useDashboardProfile } from "@/components/dashboard/profile-context";
import { RecyclerFleetOverview } from "@/components/dashboard/driver-workflow";
import { usePickupRealtime } from "@/hooks/use-pickup-realtime";

const copy = {
  vendor: {
    eyebrow: "Vendor workspace",
    title: null,
    description:
      "Manage pickup requests, inventory insights, and your recycling progress.",
    action: "Request pickup",
    href: "/dashboard/vendor/request-pickup",
  },
  recycler: {
    eyebrow: "Recycling partner",
    title: null,
    description:
      "Review available pickup jobs and manage your collection activity.",
    action: "Find pickup jobs",
    href: "/dashboard/recycler/jobs",
  },
  driver: {
    eyebrow: "Driver route",
    title: null,
    description:
      "Follow your assigned route and keep every pickup status current.",
    action: "View today's jobs",
    href: "/dashboard/driver/jobs",
  },
  admin: {
    eyebrow: "BBMP operations",
    title: "Operations overview",
    description:
      "A live view of collection performance across your markets and recycling network.",
    action: "Generate report",
    href: "/dashboard/admin/reports",
  },
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function RoleOverview({ role }: { role: DashboardRole }) {
  const profile = useDashboardProfile();
  const content = copy[role];
  const resource = useAsyncResource(
    () => analyticsService.getDashboard(role),
    role,
  );
  usePickupRealtime(resource.reload);
  const displayName =
    role === "recycler"
      ? profile?.organization || profile?.name || "Recycling partner"
      : profile?.name ||
        profile?.organization ||
        (role === "driver" ? "Driver" : "Vendor");
  const title =
    role === "admin"
      ? (content.title ?? "Operations overview")
      : `${greeting()}, ${displayName}`;
  const eyebrow =
    role === "admin"
      ? content.eyebrow
      : profile?.organization || content.eyebrow;
  return (
    <div className="space-y-5 sm:space-y-8">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={content.description}
        action={
          <Button asChild>
            <Link href={content.href}>
              {role === "vendor" ? (
                <Plus className="size-4" />
              ) : role === "admin" ? (
                <CalendarDays className="size-4" />
              ) : (
                <Navigation className="size-4" />
              )}
              {content.action}
            </Link>
          </Button>
        }
      />
      {resource.loading ? (
        <DashboardLoading />
      ) : resource.error || !resource.data ? (
        <Panel>
          <div className="p-6 text-center sm:p-8">
            <p className="text-sm font-semibold text-rose-700">
              Dashboard data is unavailable.
            </p>
            <button
              onClick={resource.reload}
              className="mt-3 min-h-11 text-xs font-semibold text-emerald-600"
            >
              Try again
            </button>
          </div>
        </Panel>
      ) : (
        <DashboardContent role={role} data={resource.data} />
      )}
    </div>
  );
}

function DashboardContent({
  role,
  data,
}: {
  role: DashboardRole;
  data: DashboardAnalytics;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {data.metrics.map((metric, index) => (
          <MetricCard key={metric.label} metric={metric} index={index} />
        ))}
      </div>
      <DashboardAIInsights role={role} data={data} />
      {role === "vendor" && <VendorOverview requests={data.recentRequests} />}
      {role === "recycler" && <RecyclerFleetOverview jobs={data.jobs} />}
      {role === "driver" && <DriverOverview jobs={data.jobs} />}
      {role === "admin" && (
        <AdminOverview
          extraMetrics={data.extraMetrics}
          markets={data.markets}
        />
      )}
    </>
  );
}

function DashboardLoading() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 sm:h-32 sm:rounded-2xl"
        />
      ))}
    </div>
  );
}

function VendorOverview({ requests }: { requests: PickupRequest[] }) {
  const recent = requests.slice(0, 3);
  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[1.45fr_.55fr] xl:gap-5">
        <Panel
          title="Recent pickup requests"
          subtitle="Your latest collection activity"
          action={
            <Link
              href="/dashboard/vendor/requests"
              className="flex min-h-11 items-center text-xs font-semibold text-emerald-600 sm:min-h-0"
            >
              View all
            </Link>
          }
        >
          <div className="grid gap-2.5 p-3 sm:hidden">
            {recent.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-950/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Pickup request
                    </p>
                    <h3 className="mt-1 text-xs font-semibold">{item.id}</h3>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-[10px]">
                  <div>
                    <p className="text-slate-400">Waste type</p>
                    <p className="mt-1 font-semibold text-slate-700 dark:text-slate-200">
                      {item.waste}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Requested time</p>
                    <p className="mt-1 font-semibold text-slate-700 dark:text-slate-200">
                      {item.time}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[10px] dark:border-slate-800">
                  <span className="text-slate-400">Recycler</span>
                  <span className="font-medium">{item.recycler}</span>
                </div>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[700px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[9px] uppercase tracking-wider text-slate-400 dark:border-slate-800">
                  {[
                    "Request",
                    "Waste",
                    "Recycler",
                    "Pickup time",
                    "Status",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-5 py-3 font-semibold sm:px-6"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                  >
                    <td className="px-5 py-4 text-xs font-semibold text-slate-800 dark:text-slate-100 sm:px-6">
                      {item.id}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500 sm:px-6">
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {item.waste}
                      </span>
                      <br />
                      <span className="text-[10px]">{item.weight}</span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500 sm:px-6">
                      {item.recycler}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500 sm:px-6">
                      {item.time}
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Recycling score" subtitle="Based on your last 30 days">
          <div className="px-5 py-5 text-center sm:px-6 sm:py-7">
            <div className="relative mx-auto grid size-32 place-items-center rounded-full border-[10px] border-emerald-100 dark:border-emerald-500/10 sm:size-40 sm:border-[12px]">
              <div>
                <p className="text-3xl font-semibold tracking-[-.06em] text-slate-950 dark:text-white sm:text-4xl">
                  92
                </p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 sm:text-[10px]">
                  Excellent
                </p>
              </div>
              <div className="absolute -right-2 top-3 grid size-8 place-items-center rounded-xl bg-emerald-600 text-white shadow-lg sm:size-9">
                <Sparkles className="size-4" />
              </div>
            </div>
            <p className="mx-auto mt-4 max-w-52 text-[11px] leading-5 text-slate-500 sm:mt-6 sm:text-xs">
              You segregated 94% of submitted waste correctly this month.
            </p>
          </div>
        </Panel>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.45fr_.55fr] xl:gap-5">
        <Panel
          title="Monthly waste"
          subtitle="Collected and successfully recycled"
        >
          <div className="p-3 sm:p-6">
            <WasteTrendChart />
          </div>
        </Panel>
        <Panel title="Waste mix" subtitle="By submitted weight">
          <div className="p-3 sm:p-6">
            <WasteDonutChart />
          </div>
        </Panel>
      </div>
    </>
  );
}

/** @deprecated Kept for compatibility with older embedded dashboard imports. */
export function RecyclerOverview({ jobs }: { jobs: PickupJob[] }) {
  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[1.45fr_.55fr] xl:gap-5">
        <Panel
          title="Nearby pickup opportunities"
          subtitle="Matched to your vehicle and material capabilities"
          action={
            <Link
              href="/dashboard/recycler/jobs"
              className="flex min-h-11 items-center text-xs font-semibold text-emerald-600 sm:min-h-0"
            >
              View all jobs
            </Link>
          }
        >
          <div className="grid gap-2.5 p-3 sm:gap-3 sm:p-5">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-100 p-3.5 transition hover:border-emerald-200 hover:bg-emerald-50/30 dark:border-slate-800 dark:hover:bg-emerald-500/5 sm:flex-row sm:items-center sm:gap-4 sm:p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 sm:size-10">
                    <Recycle className="size-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs font-semibold text-slate-800 dark:text-white">
                        {job.vendor}
                      </p>
                      {job.priority === "High" && <StatusBadge status="High" />}
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                      <MapPin className="size-3" />
                      {job.location}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs sm:flex sm:gap-6">
                  <div>
                    <p className="text-[9px] uppercase text-slate-400">
                      Material
                    </p>
                    <p className="mt-1 font-semibold">
                      {job.waste} · {job.weight}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase text-slate-400">
                      Distance
                    </p>
                    <p className="mt-1 font-semibold">{job.distance}</p>
                  </div>
                </div>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  <Link href={`/dashboard/recycler/jobs?job=${job.id}`}>
                    Review <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Today's route" subtitle="3 of 7 collections complete">
          <div className="p-4 sm:p-5">
            <div className="relative space-y-6 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-slate-200 dark:before:bg-slate-700 sm:space-y-7">
              {[
                { t: "9:20 AM", n: "Madiwala Flower Market", done: true },
                { t: "10:45 AM", n: "Fresh Veg Stall 18", done: true },
                { t: "11:30 AM", n: "Lakshmi Flower Mart", done: false },
                { t: "1:10 PM", n: "Bommanahalli Market", done: false },
              ].map((stop, index) => (
                <div key={stop.n} className="relative flex gap-3">
                  <span
                    className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-4 border-white dark:border-slate-900 ${stop.done ? "bg-emerald-600 text-white" : index === 2 ? "bg-blue-500 text-white" : "bg-slate-200 text-slate-400 dark:bg-slate-700"}`}
                  >
                    {stop.done ? (
                      <CheckCircle2 className="size-3.5" />
                    ) : (
                      <span className="text-[9px] font-bold">{index + 1}</span>
                    )}
                  </span>
                  <div>
                    <p className="text-[10px] text-slate-400">{stop.t}</p>
                    <p className="mt-1 text-xs font-medium">{stop.n}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
      <Panel
        title="Collection performance"
        subtitle="Collected and recovered material over six months"
      >
        <div className="p-3 sm:p-6">
          <WasteTrendChart mode="line" />
        </div>
      </Panel>
    </>
  );
}

function DriverOverview({ jobs }: { jobs: PickupJob[] }) {
  const ordered = [...jobs].sort(
    (a, b) => (a.routeStopOrder ?? 99) - (b.routeStopOrder ?? 99),
  );
  const next = ordered.find((job) => job.status !== "Completed");
  return (
    <div className="grid gap-4 xl:grid-cols-[1.35fr_.65fr] xl:gap-5">
      <Panel
        title="Today's assigned route"
        subtitle={`${ordered.length} pickup${ordered.length === 1 ? "" : "s"} assigned`}
        action={
          <Link
            href="/dashboard/driver/jobs"
            className="flex min-h-11 items-center text-xs font-semibold text-emerald-600 sm:min-h-0"
          >
            Open jobs
          </Link>
        }
      >
        {ordered.length ? (
          <div className="divide-y divide-slate-100 p-2 dark:divide-slate-800">
            {ordered.map((job) => (
              <div
                key={job.id}
                className="flex items-center gap-3 rounded-xl p-3"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10">
                  {job.routeStopOrder ?? "•"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{job.vendor}</p>
                  <p className="mt-1 truncate text-[10px] text-slate-400">
                    {job.location} · {job.fillLevel}
                  </p>
                </div>
                <StatusBadge status={job.status ?? "Assigned"} />
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400">
            No pickups are assigned yet.
          </div>
        )}
      </Panel>
      <Panel title="Next pickup" subtitle="Route order from Smart Assignment">
        {next ? (
          <div className="p-5">
            <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10">
              <Navigation className="size-[18px]" />
            </span>
            <h2 className="mt-5 text-sm font-semibold">{next.vendor}</h2>
            <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-slate-500">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />
              {next.location}
            </p>
            <Button asChild className="mt-5 w-full" size="sm">
              <Link href="/dashboard/driver/route">Open route overview</Link>
            </Button>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400">
            Your route is clear.
          </div>
        )}
      </Panel>
    </div>
  );
}

function AdminOverview({
  extraMetrics,
  markets,
}: {
  extraMetrics: DashboardAnalytics["extraMetrics"];
  markets: MarketSummary[];
}) {
  const visibleMarkets = markets.slice(0, 4);
  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        {extraMetrics.map((item) => (
          <div
            key={item.label}
            className="flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900 sm:gap-3 sm:px-4 sm:py-3.5"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 sm:size-9">
              <item.icon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight sm:text-base">
                {item.value}
              </p>
              <p className="truncate text-[9px] text-slate-400 sm:text-[10px]">
                {item.label}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.45fr_.55fr] xl:gap-5">
        <Panel
          title="Daily collection performance"
          subtitle="Waste collected and recovered across all active markets"
        >
          <div className="p-3 sm:p-6">
            <WasteTrendChart mode="line" />
          </div>
        </Panel>
        <Panel title="Waste type distribution" subtitle="Today across the zone">
          <div className="p-3 sm:p-6">
            <WasteDonutChart />
          </div>
        </Panel>
      </div>
      <Panel
        title="Market status"
        subtitle="Live performance across connected markets"
        action={
          <Link
            href="/dashboard/admin/markets"
            className="flex min-h-11 items-center text-xs font-semibold text-emerald-600 sm:min-h-0"
          >
            View all markets
          </Link>
        }
      >
        <div className="grid gap-2.5 p-3 sm:hidden">
          {visibleMarkets.map((item) => (
            <article
              key={item.market}
              className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-950/50"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xs font-semibold">{item.market}</h3>
                <StatusBadge status={item.status} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                <div>
                  <p className="text-slate-400">Requests</p>
                  <p className="mt-1 font-semibold">{item.requests}</p>
                </div>
                <div>
                  <p className="text-slate-400">Collected</p>
                  <p className="mt-1 font-semibold">{item.collected}</p>
                </div>
                <div>
                  <p className="text-slate-400">Recycling</p>
                  <p className="mt-1 font-semibold">{item.rate}</p>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: item.rate }}
                />
              </div>
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[650px] text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[9px] uppercase tracking-wider text-slate-400 dark:border-slate-800">
                {[
                  "Market",
                  "Requests",
                  "Collected today",
                  "Recycling rate",
                  "Status",
                ].map((heading) => (
                  <th key={heading} className="px-6 py-3 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleMarkets.map((item) => (
                <tr
                  key={item.market}
                  className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                >
                  <td className="px-6 py-4 text-xs font-semibold">
                    {item.market}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {item.requests}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {item.collected}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: item.rate }}
                        />
                      </div>
                      <span className="text-xs font-medium">{item.rate}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
