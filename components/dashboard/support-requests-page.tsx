"use client";

import { useEffect, useState } from "react";
import { LifeBuoy, Mail, Phone, Search, UserRound } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import {
  EmptyState,
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/dashboard/primitives";
import { Button } from "@/components/ui/button";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { supportService } from "@/services/support.service";
import { includesSearch } from "@/utils/table";

const statusLabel = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
} as const;

const roleLabel = {
  vendor: "Vendor",
  recycler: "Recycling partner",
  driver: "Driver",
  admin: "BBMP officer",
} as const;

export function SupportRequestsPage() {
  const { t } = useLanguage();
  const resource = useAsyncResource(
    () => supportService.getRequests(),
    "bbmp-support-requests",
  );
  const [search, setSearch] = useState("");

  useEffect(() => {
    try {
      return supportService.subscribeToRequests(resource.reload);
    } catch {
      return undefined;
    }
  }, [resource.reload]);

  const requests = (resource.data ?? []).filter((request) =>
    includesSearch(
      [
        request.subject,
        request.issue,
        request.name,
        request.email,
        request.organization,
        request.market,
        request.role,
      ],
      search,
    ),
  );

  return (
    <div className="space-y-4 sm:space-y-7">
      <PageHeader
        eyebrow={t("BBMP support")}
        title={t("Support requests")}
        description={t("Review issues submitted by authenticated EcoLoop users.")}
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          aria-label={t("Search support requests")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-800 dark:bg-slate-900"
        />
      </div>

      <Panel
        title={t("User-reported issues")}
        subtitle={`${requests.length} ${t(requests.length === 1 ? "request" : "requests")}`}
      >
        {resource.loading ? (
          <div className="h-64 animate-pulse bg-slate-50 dark:bg-slate-950" />
        ) : resource.error ? (
          <div className="p-6 text-center sm:p-8">
            <p className="text-xs text-rose-600">{resource.error}</p>
            <Button size="sm" variant="outline" className="mt-4" onClick={resource.reload}>
              {t("Try again")}
            </Button>
          </div>
        ) : requests.length ? (
          <>
            <div className="grid gap-2.5 p-3 sm:hidden">
              {requests.map((request) => (
                <article
                  key={request.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-950/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">{request.subject}</p>
                      <p className="mt-1 text-[9px] text-slate-400">{request.createdLabel}</p>
                    </div>
                    <StatusBadge status={t(statusLabel[request.status])} />
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-[11px] leading-5 text-slate-600 dark:text-slate-300">
                    {request.issue}
                  </p>
                  <div className="mt-3 border-t border-slate-100 pt-3 text-[10px] dark:border-slate-800">
                    <p className="font-semibold">{request.name} · {t(roleLabel[request.role])}</p>
                    <p className="mt-1 text-slate-400">
                      {[request.organization, request.market].filter(Boolean).join(" · ") || t("No workspace details")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      <a href={`mailto:${request.email}`} className="inline-flex items-center gap-1 text-emerald-600">
                        <Mail className="size-3" /> {request.email}
                      </a>
                      {request.phone && (
                        <a href={`tel:${request.phone}`} className="inline-flex items-center gap-1 text-emerald-600">
                          <Phone className="size-3" /> {request.phone}
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[920px] text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[9px] uppercase tracking-wider text-slate-400 dark:border-slate-800">
                    {["Submitted by", "Subject and issue", "Contact", "Submitted", "Status"].map((heading) => (
                      <th key={heading} className="px-5 py-3">{t(heading)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id} className="border-b border-slate-100 align-top last:border-0 dark:border-slate-800">
                      <td className="px-5 py-4">
                        <div className="flex gap-2.5">
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 dark:bg-slate-800">
                            <UserRound className="size-3.5 text-slate-500" />
                          </span>
                          <div>
                            <p className="text-xs font-semibold">{request.name}</p>
                            <p className="mt-1 text-[10px] text-slate-400">{t(roleLabel[request.role])}</p>
                            <p className="mt-1 max-w-44 text-[10px] text-slate-400">
                              {[request.organization, request.market].filter(Boolean).join(" · ") || t("No workspace details")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-md px-5 py-4">
                        <p className="text-xs font-semibold">{request.subject}</p>
                        <p className="mt-1.5 whitespace-pre-wrap text-[10px] leading-4 text-slate-500">{request.issue}</p>
                      </td>
                      <td className="px-5 py-4 text-[10px]">
                        <a href={`mailto:${request.email}`} className="flex items-center gap-1.5 text-emerald-600">
                          <Mail className="size-3" /> {request.email}
                        </a>
                        {request.phone && (
                          <a href={`tel:${request.phone}`} className="mt-2 flex items-center gap-1.5 text-emerald-600">
                            <Phone className="size-3" /> {request.phone}
                          </a>
                        )}
                      </td>
                      <td className="px-5 py-4 text-[10px] text-slate-500">
                        <p>{request.createdLabel}</p>
                        <p className="mt-1 text-[9px] text-slate-400">
                          {new Intl.DateTimeFormat("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          }).format(new Date(request.createdAt))}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={t(statusLabel[request.status])} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <EmptyState
            icon={<LifeBuoy className="size-5" />}
            title={t(search ? "No matching support requests" : "No support requests")}
            description={t(search ? "Try a different search term." : "User issues submitted through Help Centre will appear here.")}
          />
        )}
      </Panel>
    </div>
  );
}
