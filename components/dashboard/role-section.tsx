"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Bell, Check, ChevronRight, ClipboardCheck, Download,
  FileBarChart, ImagePlus, KeyRound, MapPin, Plus, Recycle,
  Route, Save, ShieldCheck, Store, Trash2, Truck, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { WasteDonutChart, WasteTrendChart } from "@/components/dashboard/charts";
import { EmptyState, PageHeader, Panel, StatusBadge } from "@/components/dashboard/primitives";
import { roleProfiles } from "@/data/dashboard";
import { cn } from "@/lib/utils";
import type { DashboardRole } from "@/types/dashboard";
import type { FillLevel, PickupJob, PickupRequest } from "@/types/mvp";
import { analyticsService } from "@/services/analytics.service";
import { authService } from "@/services/auth.service";
import { pickupService } from "@/services/pickup.service";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { includesSearch, paginate } from "@/utils/table";
import { aiService } from "@/services/ai.service";
import {
  AssignmentQueuePage,
  DriverManagementPage,
  DriverBreakOversight,
  DriverWorkflowSection,
  FleetOverviewPage,
  PartnerAssignedJobsPage,
} from "@/components/dashboard/driver-workflow";
import { LivePickupTracking } from "@/components/dashboard/live-tracking";
import { usePickupRealtime } from "@/hooks/use-pickup-realtime";
import { isWithinOperatingHours } from "@/lib/operating-hours";
import { SupportRequestsPage } from "@/components/dashboard/support-requests-page";
import { PickupCancellationDialog } from "@/components/dashboard/pickup-cancellation-dialog";
import { estimatedPickupWeightKg, STANDARD_BIN_CAPACITY_KG } from "@/lib/pickup-weight";

const inputClass = "mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:text-sm";
const labelClass = "text-xs font-semibold text-slate-700 dark:text-slate-300";

const pickupSchema = z.object({
  priority: z.string().min(1),
  notes: z.string().max(500, "Notes must be under 500 characters.").optional(),
});

type PickupInputValues = z.input<typeof pickupSchema>;
type PickupValues = z.output<typeof pickupSchema>;

const completionSchema = z.object({
  actualWeight: z.coerce.number().min(0.1, "Enter the actual collected weight."),
  facility: z.string().min(1, "Choose a destination facility."),
  notes: z.string().max(500).optional(),
});

type CompletionInputValues = z.input<typeof completionSchema>;
type CompletionValues = z.output<typeof completionSchema>;

const profileSchema = z.object({
  name: z.string().min(2, "Enter your full name."),
  organization: z.string(),
  market: z.string().min(2, "Enter your market or operating area."),
  email: z.string().email("Enter a valid email address."),
  phone: z.string().min(10, "Enter a valid phone number."),
});

type ProfileValues = z.infer<typeof profileSchema>;

const adminSettingsSchema = z.object({
  name: z.string().min(2, "Enter your full name."),
  market: z.string().min(2, "Enter your zone or operating area."),
  email: z.string().email("Enter a valid email address."),
  phone: z.string().min(10, "Enter a valid phone number."),
});

type AdminSettingsValues = z.infer<typeof adminSettingsSchema>;

const fillLevels: Array<{ value: FillLevel; height: string }> = [
  { value: "75%", height: "75%" },
  { value: "100% (Full)", height: "100%" },
  { value: "Overflowing", height: "100%" },
];

export function RoleSection({ role, section }: { role: DashboardRole; section: string }) {
  if (role === "vendor") return <VendorSection section={section} />;
  if (role === "recycler") return <RecyclerSection section={section} />;
  if (role === "driver") {
    if (section === "profile") return <ProfilePage role="driver" />;
    return <DriverWorkflowSection section={section} />;
  }
  return <AdminSection section={section} />;
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return <div role="status" className="fixed bottom-24 right-3 z-[70] max-w-[calc(100vw-1.5rem)] sm:bottom-5 sm:right-5 flex max-w-sm items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-2xl dark:border-emerald-900 dark:bg-slate-900"><span className="grid size-8 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"><Check className="size-4" /></span><p className="text-xs font-medium text-slate-700 dark:text-slate-200">{message}</p><button onClick={onClose} className="ml-2 text-xs text-slate-400">×</button></div>;
}

function PhotoUploadField({ label, helper, onChange }: { label: string; helper: string; onChange: (file: File | null) => void }) {
  const [preview, setPreview] = useState("");
  const [fileError, setFileError] = useState("");

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const chooseFile = (file?: File) => {
    setFileError("");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFileError("Use a JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError("The image must be 5 MB or smaller.");
      return;
    }
    setPreview(URL.createObjectURL(file));
    onChange(file);
  };

  return (
    <div>
      <p className={labelClass}>{label}</p>
      <div className="mt-1.5 grid grid-cols-2 gap-2 sm:mt-2 sm:gap-3">
        <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-2 py-3 text-[10px] font-semibold text-slate-600 transition hover:border-emerald-400 hover:bg-emerald-50/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 sm:gap-2 sm:px-4 sm:py-4 sm:text-xs">
          <ImagePlus className="size-4 text-emerald-600" /> Capture Photo
          <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={(event) => chooseFile(event.target.files?.[0])} />
        </label>
        <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-2 py-3 text-[10px] font-semibold text-slate-600 transition hover:border-emerald-400 hover:bg-emerald-50/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 sm:gap-2 sm:px-4 sm:py-4 sm:text-xs">
          <Upload className="size-4 text-blue-600" /> Upload Photo
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => chooseFile(event.target.files?.[0])} />
        </label>
      </div>
      <p className="mt-2 text-[10px] leading-4 text-slate-400">{helper}</p>
      <p className="mt-1 text-[10px] text-slate-400">JPG, PNG, or WEBP · maximum 5 MB</p>
      {fileError && <p role="alert" className="mt-2 text-[10px] text-rose-600">{fileError}</p>}
      {preview && <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950 sm:mt-4 sm:rounded-2xl"><Image src={preview} alt={`${label} preview`} width={720} height={420} unoptimized className="max-h-40 w-full object-contain sm:max-h-64" /></div>}
    </div>
  );
}

function VendorSection({ section }: { section: string }) {
  if (section === "request-pickup") return <PickupForm />;
  if (section === "requests" || section === "history") return <RequestsPage history={section === "history"} />;
  if (section === "analytics") return <AnalyticsPage role="vendor" />;
  if (section === "profile") return <ProfilePage role="vendor" />;
  return <UnknownSection />;
}

function PickupPhoto({ url, alt }: { url?: string; alt: string }) {
  if (!url) return <span className="text-[10px] text-slate-400">Not provided</span>;
  return <a href={url} target="_blank" rel="noreferrer" className="block w-fit overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"><Image src={url} alt={alt} width={72} height={54} unoptimized className="h-10 w-14 object-cover sm:h-12 sm:w-16" /></a>;
}

function PickupForm() {
  const router = useRouter();
  const [wasteType, setWasteType] = useState("Wet");
  const [fillLevel, setFillLevel] = useState<FillLevel>("75%");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoKey, setPhotoKey] = useState(0);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PickupInputValues, unknown, PickupValues>({ resolver: zodResolver(pickupSchema), defaultValues: { priority: "Normal", notes: "" } });
  const submit = async (values: PickupValues) => {
    setError("");
    try {
      const imageUrl = photo ? await pickupService.uploadPickupImage(photo, "pickup") : undefined;
      const result = await pickupService.createPickup({ wasteType, fillLevel, imageUrl, ...values });
      reset();
      setFillLevel("75%");
      setPhoto(null);
      setPhotoKey((value) => value + 1);
      window.setTimeout(() => router.push("/dashboard/vendor"), 1800);
      setToast(
        isWithinOperatingHours()
          ? `Pickup ${result.id} created. We’re matching a verified recycler.`
          : `Pickup ${result.id} created. It is queued for assignment after 6:00 AM IST.`,
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn’t create this pickup request.");
    }
  };
  return <div className="space-y-3 sm:space-y-7"><PageHeader eyebrow="Vendor operations" title="Request a pickup" description="Tell us what is ready. EcoLoop will match the right authorized recycler and optimize the route." /><form onSubmit={handleSubmit(submit)} className="grid gap-3 sm:gap-5 xl:grid-cols-[1.35fr_.65fr]" noValidate><Panel title="Pickup details" subtitle="Required fields are marked with an asterisk"><div className="space-y-3 p-4 sm:space-y-6 sm:p-6"><fieldset><legend className={labelClass}>Waste type *</legend><div className="mt-2 grid grid-cols-3 gap-2 sm:mt-3 sm:grid-cols-5 sm:gap-3">{["Wet", "Dry", "Plastic", "Metal", "Mixed"].map(type => <button type="button" key={type} onClick={() => setWasteType(type)} className={cn("rounded-xl border px-2 py-3 text-center text-[10px] font-semibold transition sm:px-3 sm:py-4 sm:text-xs", wasteType === type ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-4 ring-emerald-500/10 dark:bg-emerald-500/10 dark:text-emerald-400" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950")}><span className="mx-auto mb-1 grid size-7 place-items-center rounded-lg bg-current/5 sm:mb-2 sm:size-8"><Trash2 className="size-4" /></span>{type}</button>)}</div></fieldset><fieldset><legend className={labelClass}>Bin fill level *</legend><div className="mt-2 grid grid-cols-3 gap-2 sm:mt-3 sm:grid-cols-3 sm:gap-3">{fillLevels.map((level) => <button type="button" key={level.value} aria-pressed={fillLevel === level.value} onClick={() => setFillLevel(level.value)} className={cn("rounded-xl border px-2 py-3 text-center text-[10px] font-semibold transition sm:px-3 sm:py-4 sm:text-xs", fillLevel === level.value ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-4 ring-emerald-500/10 dark:bg-emerald-500/10 dark:text-emerald-400" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950")}><span className="relative mx-auto mb-1 block h-7 w-6 overflow-hidden rounded-md border-2 border-current sm:mb-2 sm:h-9 sm:w-7"><span className="absolute inset-x-0 bottom-0 bg-emerald-500/70" style={{ height: level.height }} />{level.value === "Overflowing" && <span className="absolute inset-x-0 -top-1 text-sm leading-none">+</span>}</span>{level.value}</button>)}</div><p className="mt-2 text-[10px] leading-4 text-slate-500">Planning estimate: {estimatedPickupWeightKg(fillLevel)} kg from a standard {STANDARD_BIN_CAPACITY_KG} kg bin. The driver will confirm or correct the actual weight.</p></fieldset><label className={labelClass}>Priority *<select {...register("priority")} className={`${inputClass} mt-1.5 h-10 text-sm sm:mt-2 sm:h-11`}><option>Normal</option><option>Urgent — within 2 hours</option><option>Scheduled</option></select></label><label className={labelClass}>Collection notes<textarea {...register("notes")} rows={3} placeholder="Access instructions, packaging details, or preferred pickup time…" className={`${inputClass} mt-1.5 h-auto resize-none py-2.5 text-sm sm:mt-2 sm:py-3`} />{errors.notes && <span className="mt-1 block text-[10px] text-rose-600 sm:mt-1.5">{errors.notes.message}</span>}</label><PhotoUploadField key={photoKey} label="Pickup photo (optional, recommended)" helper="A photo helps the recycling partner assess the waste and prepare the appropriate vehicle." onChange={setPhoto} /></div></Panel><div className="space-y-3 sm:space-y-5"><Panel title="Pickup location"><div className="p-4 sm:p-5"><div className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3 dark:bg-slate-950 sm:gap-3 sm:p-4"><MapPin className="mt-0.5 size-4 text-emerald-600" /><div><p className="text-xs font-semibold">Fresh Veg Stall 18</p><p className="mt-1 text-[10px] leading-4 text-slate-500">Block C, Chandapura Market<br />Bengaluru 560099</p></div></div><button type="button" disabled title="Coming Soon" className="mt-2 cursor-not-allowed text-[10px] font-semibold text-slate-400 sm:mt-3">Change pickup location · Coming Soon</button></div></Panel><Panel><div className="p-4 sm:p-5"><div className="flex gap-2.5 sm:gap-3"><ShieldCheck className="size-5 shrink-0 text-blue-500" /><div><p className="text-xs font-semibold">Verified collection only</p><p className="mt-1 text-[10px] leading-4 text-slate-500">Your request is visible only to authorized recycling partners.</p></div></div>{error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-[10px] text-rose-600 sm:mt-4">{error}</p>}<Button type="submit" className="mt-4 w-full sm:mt-6" disabled={isSubmitting}>{isSubmitting ? "Creating request…" : "Submit pickup request"}<ChevronRight className="size-4" /></Button></div></Panel></div></form>{toast && <Toast message={toast} onClose={() => setToast("")} />}</div>;
}

function RequestsPage({ history, admin = false }: { history: boolean; admin?: boolean }) {
  const resource = useAsyncResource(() => pickupService.getRequests(), `requests-${history}-${admin}`);
  usePickupRealtime(resource.reload);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [sort, setSort] = useState("Newest");
  const [page, setPage] = useState(1);
  const [cancellationTarget, setCancellationTarget] = useState<PickupRequest | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancellationError, setCancellationError] = useState("");
  const [toast, setToast] = useState("");
  const canCancel = (item: PickupRequest) =>
    !history &&
    (admin
      ? ["Pending", "Assigned", "Accepted", "In transit", "Arrived"].includes(item.status)
      : item.status === "Pending");
  const cancelPickup = async (reason?: string) => {
    if (!cancellationTarget) return;
    setCancelling(true);
    setCancellationError("");
    try {
      await pickupService.cancelPickup(cancellationTarget.id, reason);
      resource.reload();
      setToast(`Pickup ${cancellationTarget.id} was cancelled.`);
      setCancellationTarget(null);
    } catch (cause) {
      setCancellationError(
        cause instanceof Error ? cause.message : "The pickup could not be cancelled.",
      );
    } finally {
      setCancelling(false);
    }
  };
  const filtered = useMemo(() => (resource.data ?? [])
    .filter((row) => !history || row.status === "Completed")
    .filter((row) => status === "All statuses" || row.status === status)
    .filter((row) => includesSearch([row.id, row.waste, row.recycler], search))
    .sort((a, b) => sort === "Newest" ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id)), [resource.data, history, search, sort, status]);
  const pageInfo = paginate(filtered, page, 5);
  const headers = [
    ...(admin
      ? ["Request ID", "Waste type", "Fill level", "Actual weight", "Pickup photo", "Completion photo", "Status", "Status timeline"]
      : ["Request ID", "Waste type", "Fill level", "Actual weight", "Assigned recycler", "Status", "Created time", "ETA"]),
    ...(!history ? ["Actions"] : []),
  ];
  const activeTrackingRequest = filtered.find(
    (item) =>
      item.assignedDriverId &&
      ["Assigned", "Accepted", "In transit", "Arrived", "Collected"].includes(
        item.status,
      ),
  );
  return (
    <div className="space-y-3 sm:space-y-7">
      <PageHeader eyebrow={admin ? "BBMP operations" : "Vendor operations"} title={history ? "Pickup history" : admin ? "Pickup requests" : "My requests"} description={history ? "A complete, auditable record of recovered waste." : admin ? "Live status and SLA visibility across all connected markets." : "Track live pickup status, assigned partners, and arrival estimates."} action={!history && !admin && <Button asChild><Link href="/dashboard/vendor/request-pickup"><Plus className="size-4" /> New request</Link></Button>} />
      {activeTrackingRequest && (
        <LivePickupTracking
          driverId={activeTrackingRequest.assignedDriverId}
          status={activeTrackingRequest.status}
          destinationLatitude={activeTrackingRequest.vendorLatitude}
          destinationLongitude={activeTrackingRequest.vendorLongitude}
        />
      )}
      <Panel>
        <div className="grid grid-cols-2 gap-2 border-b border-slate-100 p-3 dark:border-slate-800 sm:flex sm:gap-3 sm:p-4">
          <input aria-label="Search requests" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search request ID…" className={`${inputClass} col-span-2 mt-0 h-10 text-sm sm:max-w-xs`} />
          <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)} className={`${inputClass} mt-0 h-10 text-sm sm:ml-auto sm:w-40`}><option>All statuses</option><option>Pending</option><option>Assigned</option><option>Accepted</option><option>In transit</option><option>Arrived</option><option>Collected</option><option>Completed</option><option>Cancelled</option></select>
          <select aria-label="Sort requests" value={sort} onChange={(event) => setSort(event.target.value)} className={`${inputClass} mt-0 h-10 text-sm sm:w-32`}><option>Newest</option><option>Oldest</option></select>
        </div>
        {resource.loading ? <div className="h-40 animate-pulse bg-slate-50 dark:bg-slate-900 sm:h-56" /> : resource.error ? <div className="p-5 text-center sm:p-8"><p className="text-[11px] text-rose-600 sm:text-xs">{resource.error}</p><Button size="sm" variant="outline" className="mt-3 sm:mt-4" onClick={resource.reload}>Try again</Button></div> : pageInfo.rows.length ? <>
          <div className="grid gap-2 p-2.5 sm:hidden">
            {pageInfo.rows.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Pickup request</p>
                    <h3 className="mt-0.5 text-xs font-semibold">{item.id}</h3>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2 text-[10px]">
                  <div><p className="text-slate-400">Waste type</p><p className="mt-0.5 font-semibold">{item.waste}</p></div>
                  <div><p className="text-slate-400">Fill level</p><p className="mt-0.5 font-semibold">{item.fillLevel}</p></div>
                  <div><p className="text-slate-400">Actual weight</p><p className="mt-0.5 font-semibold">{item.actualWeight ? `${item.actualWeight} kg` : "Pending"}</p></div>
                  <div><p className="text-slate-400">Requested</p><p className="mt-0.5 font-semibold">{item.time}</p></div>
                </div>
                {item.status === "Cancelled" && item.cancellationReason && (
                  <p className="mt-2.5 rounded-lg bg-rose-50 px-2.5 py-2 text-[10px] leading-4 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                    <span className="font-semibold">Cancellation reason:</span> {item.cancellationReason}
                  </p>
                )}
                {admin ? (
                  <div className="mt-2.5 flex items-center gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                    <PickupPhoto url={item.imageUrl} alt={`Pickup ${item.id}`} />
                    <PickupPhoto url={item.completionImageUrl} alt={`Completed pickup ${item.id}`} />
                    <span className="ml-auto text-[9px] text-slate-400">Pickup · Completion</span>
                  </div>
                ) : (
                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[10px] dark:border-slate-800">
                    <span className="truncate text-slate-400">{item.recycler}</span>
                    <span className="shrink-0 font-semibold">ETA {item.eta}</span>
                  </div>
                )}
                {canCancel(item) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 w-full border-rose-200 text-rose-700 hover:border-rose-300 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300"
                    onClick={() => {
                      setCancellationError("");
                      setCancellationTarget(item);
                    }}
                  >
                    Cancel request
                  </Button>
                )}
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[1050px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[9px] uppercase tracking-wider text-slate-400 dark:border-slate-800">
                  {headers.map((heading) => <th key={heading} className="px-6 py-3 font-semibold">{heading}</th>)}
                </tr>
              </thead>
              <tbody>
                {pageInfo.rows.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                    <td className="px-6 py-4 text-xs font-semibold">{item.id}</td>
                    <td className="px-6 py-4 text-xs font-medium">{item.waste}</td>
                    <td className="px-6 py-4 text-xs font-semibold">{item.fillLevel}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">{item.actualWeight ? `${item.actualWeight} kg` : "Pending collection"}</td>
                    {admin ? (
                      <>
                        <td className="px-6 py-4"><PickupPhoto url={item.imageUrl} alt={`Pickup ${item.id}`} /></td>
                        <td className="px-6 py-4"><PickupPhoto url={item.completionImageUrl} alt={`Completed pickup ${item.id}`} /></td>
                        <td className="px-6 py-4">
                          <StatusBadge status={item.status} />
                          {item.status === "Cancelled" && item.cancellationReason && (
                            <p className="mt-1.5 max-w-48 text-[10px] leading-4 text-rose-600 dark:text-rose-300">{item.cancellationReason}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="min-w-36 space-y-1">
                            {item.timeline?.map((event, index) => (
                              <p key={`${event.status}-${index}`} className="text-[10px] text-slate-500">
                                <span className="font-semibold text-slate-700 dark:text-slate-200">{event.status}</span> · {event.time}
                                {event.note && <span className="block max-w-52 leading-4 text-rose-600 dark:text-rose-300">{event.note}</span>}
                              </p>
                            ))}
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 text-xs text-slate-500">{item.recycler}</td>
                        <td className="px-6 py-4">
                          <StatusBadge status={item.status} />
                          {item.status === "Cancelled" && item.cancellationReason && (
                            <p className="mt-1.5 max-w-48 text-[10px] leading-4 text-rose-600 dark:text-rose-300">{item.cancellationReason}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">{item.time}</td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-700 dark:text-slate-200">{item.eta}</td>
                      </>
                    )}
                    {!history && (
                      <td className="px-6 py-4">
                        {canCancel(item) ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:text-rose-300 dark:hover:bg-rose-500/10"
                            onClick={() => {
                              setCancellationError("");
                              setCancellationTarget(item);
                            }}
                          >
                            Cancel
                          </Button>
                        ) : (
                          <span className="text-[10px] text-slate-400">Not available</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 text-[10px] text-slate-400 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"><span>{pageInfo.total} request{pageInfo.total === 1 ? "" : "s"}</span><div className="flex items-center justify-between gap-2 sm:justify-end"><Button size="sm" variant="outline" disabled={pageInfo.page === 1} onClick={() => setPage(pageInfo.page - 1)}>Previous</Button><span>Page {pageInfo.page} of {pageInfo.totalPages}</span><Button size="sm" variant="outline" disabled={pageInfo.page === pageInfo.totalPages} onClick={() => setPage(pageInfo.page + 1)}>Next</Button></div></div>
        </> : <EmptyState icon={<ClipboardCheck className="size-5" />} title="No requests found" description="Try changing the search or status filter." />}
      </Panel>
      <PickupCancellationDialog
        open={Boolean(cancellationTarget)}
        role={admin ? "admin" : "vendor"}
        referenceCode={cancellationTarget?.id ?? ""}
        loading={cancelling}
        error={cancellationError}
        onClose={() => {
          if (!cancelling) {
            setCancellationError("");
            setCancellationTarget(null);
          }
        }}
        onConfirm={cancelPickup}
      />
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}

function RecyclerSection({ section }: { section: string }) {
  if (section === "jobs") return <AssignmentQueuePage />;
  if (section === "accepted") return <PartnerAssignedJobsPage />;
  if (section === "drivers") return <DriverManagementPage />;
  if (section === "history") return <RecyclerHistory />;
  if (section === "vehicles") return <FleetOverviewPage />;
  if (section === "analytics") return <AnalyticsPage role="recycler" />;
  if (section === "profile") return <ProfilePage role="recycler" />;
  return <UnknownSection />;
}

/** @deprecated Retained for compatibility with older embedded recycler links. */
export function AvailableJobsPage() {
  const resource = useAsyncResource(() => pickupService.getAvailableJobs(), "available-jobs");
  const [selected, setSelected] = useState<PickupJob | null>(null);
  const [toast, setToast] = useState("");
  const [accepting, setAccepting] = useState("");
  const accept = async (id: string) => { setAccepting(id); try { await pickupService.acceptPickup(id); resource.setData((resource.data ?? []).filter((job) => job.id !== id)); setToast(`Job ${id} accepted and added to today’s route.`); setSelected(null); } catch (reason) { setToast(reason instanceof Error ? reason.message : "This job could not be accepted."); } finally { setAccepting(""); } };
  const jobs = resource.data ?? [];
  return <div className="space-y-7"><PageHeader eyebrow="Recycler network" title="Available pickup jobs" description="Opportunities matched to your accepted materials, vehicle capacity, and live location." />{resource.loading ? <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">{Array.from({length:3},(_,index)=><div key={index} className="h-64 animate-pulse rounded-2xl bg-white dark:bg-slate-900" />)}</div> : resource.error ? <Panel><div className="p-8 text-center"><p className="text-xs text-rose-600">{resource.error}</p><Button size="sm" variant="outline" className="mt-4" onClick={resource.reload}>Try again</Button></div></Panel> : jobs.length ? <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">{jobs.map(job => <article key={job.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,.04)] transition hover:-translate-y-0.5 hover:border-emerald-200 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><span className="text-[10px] font-bold text-slate-400">{job.id}</span><StatusBadge status={job.priority} /></div><div className="mt-5 flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"><Store className="size-[18px]" /></span><div><h2 className="text-sm font-semibold">{job.vendor}</h2><p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400"><MapPin className="size-3" />{job.location}</p></div></div><div className="mt-6 grid grid-cols-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-950">{[["Waste", job.waste], ["Fill level", job.fillLevel], ["Created", job.createdTime]].map(([key,value]) => <div key={key}><p className="text-[9px] uppercase tracking-wider text-slate-400">{key}</p><p className="mt-1 text-xs font-semibold">{value}</p></div>)}</div><div className="mt-5 flex gap-2"><Button className="flex-1" size="sm" disabled={accepting === job.id} onClick={() => accept(job.id)}>{accepting === job.id ? "Accepting…" : "Accept job"}</Button><Button variant="outline" size="sm" onClick={() => setSelected(job)}>View details</Button></div></article>)}</div> : <Panel><EmptyState icon={<Recycle className="size-5" />} title="No jobs available" description="New matched pickup opportunities will appear here." /></Panel>}{selected && <Panel title={`Pickup ${selected.id}`} subtitle="Review the collection before accepting"><div className="grid gap-6 p-5 lg:grid-cols-[.8fr_1.2fr]"><div className="space-y-4">{[["Waste type", selected.waste], ["Fill level", selected.fillLevel], ["Priority", selected.priority], ["Collection notes", selected.notes || "None provided"], ["Created time", selected.createdTime]].map(([key,value]) => <div key={key}><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{key}</p><p className="mt-1 text-xs font-medium">{value}</p></div>)}<Button className="w-full" disabled={accepting === selected.id} onClick={() => accept(selected.id)}>{accepting === selected.id ? "Accepting…" : "Accept this pickup"}</Button></div><div className="min-h-64 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">{selected.imageUrl ? <Image src={selected.imageUrl} alt={`Waste for pickup ${selected.id}`} width={900} height={600} unoptimized className="h-full min-h-64 w-full object-cover" /> : <div className="grid min-h-64 place-items-center text-center text-xs text-slate-400"><div><ImagePlus className="mx-auto mb-2 size-6" />No pickup photo provided</div></div>}</div></div></Panel>}{toast && <Toast message={toast} onClose={() => setToast("")} />}</div>;
}

/** @deprecated Retained for compatibility with older embedded recycler links. */
export function AcceptedJobsPage() {
  const resource = useAsyncResource(() => pickupService.getAcceptedJobs(), "accepted-jobs");
  const [toast, setToast] = useState("");
  const [updating, setUpdating] = useState("");
  const [completionPhoto, setCompletionPhoto] = useState<File | null>(null);
  const [completionPhotoKey, setCompletionPhotoKey] = useState(0);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CompletionInputValues, unknown, CompletionValues>({ resolver: zodResolver(completionSchema), defaultValues: { facility: "GreenCycle · Electronic City", notes: "" } });
  const jobs = resource.data ?? [];
  const activeJob = jobs.find((job) => job.status === "In transit");
  const startPickup = async (job: PickupJob) => { setUpdating(job.id); try { const updated = await pickupService.startPickup(job.id); resource.setData(jobs.map((item) => item.id === job.id ? updated : item)); setToast(`${job.id} is now in transit.`); } catch (reason) { setToast(reason instanceof Error ? reason.message : "Status update failed."); } finally { setUpdating(""); } };
  const submit = async (values: CompletionValues) => {
    if (!activeJob) return;
    try {
      const completionImageUrl = completionPhoto ? await pickupService.uploadPickupImage(completionPhoto, "completion") : undefined;
      await pickupService.completePickup(activeJob.id, { ...values, completionImageUrl });
      resource.setData(jobs.map((item) => item.id === activeJob.id ? { ...item, ...values, completionImageUrl, status: "Completed" } : item));
      reset();
      setCompletionPhoto(null);
      setCompletionPhotoKey((value) => value + 1);
      setToast("Pickup completed. Actual weight and recovery data have been recorded.");
    } catch (reason) {
      setToast(reason instanceof Error ? reason.message : "Pickup completion failed.");
    }
  };
  return <div className="space-y-7"><PageHeader eyebrow="Recycler network" title="Accepted jobs" description="Your active route, pickup details, and completion workflow in one place." />{resource.loading ? <div className="h-72 animate-pulse rounded-2xl bg-white dark:bg-slate-900" /> : resource.error ? <Panel><div className="p-8 text-center"><p className="text-xs text-rose-600">{resource.error}</p><Button size="sm" variant="outline" className="mt-4" onClick={resource.reload}>Try again</Button></div></Panel> : <div className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]"><Panel title="Today’s collection route" subtitle={`${jobs.filter((job) => job.status !== "Completed").length} pickups remaining`}><div className="divide-y divide-slate-100 p-2 dark:divide-slate-800">{jobs.length ? jobs.map((job, i) => <div key={job.id} className="flex items-center gap-3 rounded-xl p-3 hover:bg-slate-50 dark:hover:bg-slate-950"><span className="grid size-9 place-items-center rounded-xl bg-slate-100 text-xs font-bold dark:bg-slate-800">{i + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{job.vendor}</p><p className="mt-1 text-[10px] text-slate-400">{job.waste} · {job.fillLevel}</p></div><StatusBadge status={job.status ?? "Accepted"} />{job.status === "Accepted" && <Button size="sm" variant="ghost" disabled={updating === job.id} onClick={() => startPickup(job)}>{updating === job.id ? "Updating…" : "Start"}</Button>}</div>) : <EmptyState icon={<Truck className="size-5" />} title="No accepted jobs" description="Accept a pickup opportunity to build today’s route." />}</div></Panel><Panel title="Complete pickup" subtitle={activeJob ? `${activeJob.id} · ${activeJob.vendor}` : "No active pickup"}>{activeJob ? <form onSubmit={handleSubmit(submit)} className="space-y-5 p-5 sm:p-6"><div className="grid gap-4 sm:grid-cols-2"><label className={labelClass}>Actual Weight (kg) *<input {...register("actualWeight")} type="number" min="0.1" step="0.1" className={inputClass} placeholder="e.g. 61" />{errors.actualWeight && <span className="mt-1.5 block text-[10px] text-rose-600">{errors.actualWeight.message}</span>}</label><label className={labelClass}>Destination facility *<select {...register("facility")} className={inputClass}><option>GreenCycle · Electronic City</option><option>ReForm · Jigani</option></select></label></div><PhotoUploadField key={completionPhotoKey} label="Completion photo (optional)" helper="Add a photo of the weighed, collected material for the recovery record." onChange={setCompletionPhoto} /><label className={labelClass}>Collection notes<textarea {...register("notes")} rows={3} className={`${inputClass} h-auto py-3`} placeholder="Any variance or collection note…" /></label><Button type="submit" disabled={isSubmitting} className="w-full"><ClipboardCheck className="size-4" /> {isSubmitting ? "Recording pickup…" : "Complete pickup"}</Button></form> : <EmptyState icon={<ClipboardCheck className="size-5" />} title="Route complete" description="There are no in-transit pickups waiting for completion." />}</Panel></div>}{toast && <Toast message={toast} onClose={() => setToast("")} />}</div>;
}

function RecyclerHistory() {
  const resource = useAsyncResource(() => pickupService.getHistory(), "recycler-history");
  const [search, setSearch] = useState("");
  const rows = (resource.data ?? []).filter((job) => includesSearch([job.id, job.vendor, job.waste], search));
  return <div className="space-y-7"><PageHeader eyebrow="Recycler network" title="Collection history" description="Completed pickups and proof-of-recovery records." /><Panel><div className="border-b border-slate-100 p-4 dark:border-slate-800"><input aria-label="Search collection history" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search collection or vendor…" className={`${inputClass} mt-0 max-w-xs`} /></div>{resource.loading ? <div className="h-56 animate-pulse bg-slate-50 dark:bg-slate-900" /> : resource.error ? <div className="p-8 text-center text-xs text-rose-600">{resource.error}</div> : rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left"><thead><tr className="border-b border-slate-100 text-[9px] uppercase tracking-wider text-slate-400 dark:border-slate-800">{["Collection", "Vendor", "Material", "Actual weight", "Facility", "Completion photo", "Status"].map(h => <th key={h} className="px-6 py-3">{h}</th>)}</tr></thead><tbody>{rows.map((job,i) => <tr key={`${job.id}-${i}`} className="border-b border-slate-100 last:border-0 dark:border-slate-800"><td className="px-6 py-4 text-xs font-semibold">{job.id}</td><td className="px-6 py-4 text-xs">{job.vendor}</td><td className="px-6 py-4 text-xs text-slate-500">{job.waste}</td><td className="px-6 py-4 text-xs text-slate-500">{job.actualWeight ? `${job.actualWeight} kg` : "—"}</td><td className="px-6 py-4 text-xs text-slate-500">{job.facility ?? "—"}</td><td className="px-6 py-4"><PickupPhoto url={job.completionImageUrl} alt={`Completed pickup ${job.id}`} /></td><td className="px-6 py-4"><StatusBadge status="Completed" /></td></tr>)}</tbody></table></div> : <EmptyState icon={<ClipboardCheck className="size-5" />} title="No collections found" description="Completed pickups will appear here." />}</Panel></div>;
}

/** @deprecated Retained for compatibility with older embedded recycler links. */
export function VehiclesPage() {
  const resource = useAsyncResource(() => pickupService.getVehicles(), "vehicles");
  return <div className="space-y-7"><PageHeader eyebrow="Fleet operations" title="Vehicles" description="Capacity, driver assignment, and live availability for your collection fleet." action={<Button disabled title="Coming Soon"><Plus className="size-4" /> Add vehicle · Coming Soon</Button>} />{resource.loading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({length:3},(_,index)=><div key={index} className="h-56 animate-pulse rounded-2xl bg-white dark:bg-slate-900" />)}</div> : resource.error ? <Panel><div className="p-8 text-center text-xs text-rose-600">{resource.error}</div></Panel> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{resource.data?.map(v => <Panel key={v.id}><div className="p-5"><div className="flex justify-between"><span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10"><Truck className="size-5" /></span><StatusBadge status={v.status} /></div><h2 className="mt-6 text-sm font-semibold">{v.id}</h2><p className="mt-1 text-xs text-slate-500">Driver · {v.driver}</p><div className="mt-5 grid grid-cols-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-950"><div><p className="text-[9px] uppercase text-slate-400">Capacity</p><p className="mt-1 text-xs font-semibold">{v.capacity}</p></div><div><p className="text-[9px] uppercase text-slate-400">Current load</p><p className="mt-1 text-xs font-semibold">{v.load}</p></div></div></div></Panel>)}</div>}</div>;
}

function AdminSection({ section }: { section: string }) {
  if (section === "markets") return <MarketsPage />;
  if (section === "requests") return <AdminRequests />;
  if (section === "partners") return <PartnersPage />;
  if (section === "analytics") return <AnalyticsPage role="admin" />;
  if (section === "reports") return <ReportsPage />;
  if (section === "support") return <SupportRequestsPage />;
  if (section === "settings") return <AdminSettingsPage />;
  return <UnknownSection />;
}

function MarketsPage() {
  const resource = useAsyncResource(() => analyticsService.getMarkets(), "markets");
  const [search, setSearch] = useState("");
  const rows = (resource.data ?? []).filter((item) => includesSearch([item.market, item.ward], search));
  return <div className="space-y-7"><PageHeader eyebrow="BBMP operations" title="Connected markets" description="Monitor collection volume, participation, and recycling performance by market." /><input aria-label="Search connected markets" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search market or ward…" className={`${inputClass} mt-0 max-w-xs`} />{resource.loading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({length:6},(_,index)=><div key={index} className="h-56 animate-pulse rounded-2xl bg-white dark:bg-slate-900" />)}</div> : resource.error ? <Panel><div className="p-8 text-center"><p className="text-xs text-rose-600">{resource.error}</p><Button size="sm" variant="outline" className="mt-4" onClick={resource.reload}>Try again</Button></div></Panel> : rows.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map((item) => <Panel key={item.market}><div className="p-5"><div className="flex justify-between"><span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"><Store className="size-[18px]" /></span><StatusBadge status={item.status} /></div><h2 className="mt-6 text-sm font-semibold">{item.market}</h2><p className="mt-1 text-[10px] text-slate-400">Ward {item.ward} · {item.vendors} active vendors</p><div className="mt-5 grid grid-cols-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-950">{[["Requests", item.requests], ["Collected", item.collected], ["Recycled", item.rate]].map(([k,v]) => <div key={k}><p className="text-[9px] uppercase text-slate-400">{k}</p><p className="mt-1 text-xs font-semibold">{v}</p></div>)}</div></div></Panel>)}</div> : <Panel><EmptyState icon={<Store className="size-5" />} title="No connected markets" description="Markets will appear after they are added to Supabase and vendors are assigned." /></Panel>}</div>;
}

function AdminRequests() {
  return (
    <div className="space-y-4 sm:space-y-7">
      <DriverBreakOversight />
      <RequestsPage history={false} admin />
    </div>
  );
}

function PartnersPage() {
  const resource = useAsyncResource(() => analyticsService.getPartners(), "partners");
  const partners = resource.data ?? [];
  return <div className="space-y-7"><PageHeader eyebrow="BBMP operations" title="Recycling partners" description="Authorized collectors and facilities operating across your zone." />{resource.loading ? <div className="grid gap-4 lg:grid-cols-3">{Array.from({length:3},(_,index)=><div key={index} className="h-56 animate-pulse rounded-2xl bg-white dark:bg-slate-900" />)}</div> : resource.error ? <Panel><div className="p-8 text-center"><p className="text-xs text-rose-600">{resource.error}</p><Button size="sm" variant="outline" className="mt-4" onClick={resource.reload}>Try again</Button></div></Panel> : partners.length ? <div className="grid gap-4 lg:grid-cols-3">{partners.map(p => <Panel key={p.name}><div className="p-5"><div className="flex justify-between"><span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"><Recycle className="size-5" /></span><StatusBadge status="Active" /></div><h2 className="mt-6 text-sm font-semibold">{p.name}</h2><p className="mt-1 text-[10px] text-slate-400">{p.category}</p><div className="mt-5 grid grid-cols-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-950"><div><p className="text-[9px] text-slate-400">Trucks</p><p className="mt-1 text-xs font-semibold">{p.trucks}</p></div><div><p className="text-[9px] text-slate-400">Jobs</p><p className="mt-1 text-xs font-semibold">{p.jobs}</p></div><div><p className="text-[9px] text-slate-400">SLA</p><p className="mt-1 text-xs font-semibold">{p.rate}</p></div></div></div></Panel>)}</div> : <Panel><EmptyState icon={<Recycle className="size-5" />} title="No approved recycling partners" description="Approved recycler accounts will appear here automatically." /></Panel>}</div>;
}

function AnalyticsPage({ role }: { role: DashboardRole }) {
  const resource = useAsyncResource(() => analyticsService.getDashboard(role), `analytics-${role}`);
  return <div className="space-y-4 sm:space-y-7"><PageHeader eyebrow={`${roleProfiles[role].shortRole} intelligence`} title="Analytics" description="Clear trends and measurable environmental outcomes from your EcoLoop activity." />{resource.loading ? <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">{Array.from({length:4},(_,index)=><div key={index} className="h-24 animate-pulse rounded-xl bg-white dark:bg-slate-900 sm:h-32 sm:rounded-2xl" />)}</div> : resource.error || !resource.data ? <Panel><div className="p-5 text-center sm:p-8"><p className="text-[11px] text-rose-600 sm:text-xs">{resource.error || "Analytics are temporarily unavailable."}</p><Button size="sm" variant="outline" className="mt-3 sm:mt-4" onClick={resource.reload}>Try again</Button></div></Panel> : <><div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">{resource.data.metrics.map((metric) => <div key={metric.label} className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900 sm:rounded-2xl sm:p-5"><p className="text-xl font-semibold tracking-[-.04em] sm:text-2xl">{metric.value}</p><p className="mt-1 text-[10px] leading-4 text-slate-500 sm:mt-2 sm:text-xs">{metric.label}</p><p className="mt-2 text-[9px] font-medium text-emerald-600 sm:mt-4 sm:text-[10px]">{metric.change}</p></div>)}</div><div className="grid gap-3 sm:gap-5 xl:grid-cols-[1.35fr_.65fr]"><Panel title="Monthly waste trend" subtitle="Collection and recovery volume"><div className="p-3 sm:p-6"><WasteTrendChart mode="line" compactOnMobile /></div></Panel><Panel title="Material distribution" subtitle="Share by weight"><div className="p-3 sm:p-6"><WasteDonutChart compactOnMobile /></div></Panel></div><Panel title={role === "admin" ? "Market comparison" : "Performance details"}><div className="p-3 sm:p-6"><WasteTrendChart compactOnMobile /></div></Panel></>}</div>;
}

function ReportsPage() {
  const [toast, setToast] = useState("");
  const [generating, setGenerating] = useState("");
  const [reports, setReports] = useState<Array<{ filename: string; title: string; format: string; createdAt: string; blob: Blob }>>([]);
  const download = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const generate = async (format: "PDF" | "CSV" | "dashboard", title: string) => {
    const key = `${title}-${format}`;
    setGenerating(key);
    try {
      if (format === "dashboard") {
        const dashboard = await analyticsService.getDashboard("admin");
        const report = await aiService.generateWeeklyReport("admin", "weekly", { metrics: dashboard.metrics.map(({ label, value, change }) => ({ label, value, change })), wasteTrend: dashboard.wasteTrend, wasteCategories: dashboard.wasteCategories, markets: dashboard.markets, recentRequests: dashboard.recentRequests.slice(0, 10) });
        const text = `${report.title}\n\n${report.summary}\n\nHighlights\n${report.highlights.map((item) => `• ${item}`).join("\n")}\n\nRisks\n${report.risks.map((item) => `• ${item}`).join("\n")}\n\nRecommendations\n${report.recommendations.map((item) => `• ${item}`).join("\n")}\n\nGenerated ${new Date(report.generatedAt).toLocaleString("en-IN")}`;
        const filename = `ecoloop-ai-weekly-report-${new Date().toISOString().slice(0, 10)}.txt`;
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        download(blob, filename);
        if (navigator.clipboard) await navigator.clipboard.writeText(text).catch(() => undefined);
        setReports((current) => [{ filename, title: report.title, format: "AI summary", createdAt: new Date().toLocaleString("en-IN"), blob }, ...current]);
        setToast(`${filename} downloaded${navigator.clipboard ? " and copied" : ""}.`);
        return;
      }
      const result = await analyticsService.generateReport(format, title);
      download(result.blob, result.filename);
      setReports((current) => [{ filename: result.filename, title, format: format === "CSV" ? "CSV" : "PDF", createdAt: new Date().toLocaleString("en-IN"), blob: result.blob }, ...current]);
      setToast(`${result.filename} downloaded.`);
    } catch (reason) {
      setToast(reason instanceof Error ? reason.message : "The report could not be generated.");
    } finally {
      setGenerating("");
    }
  };
  const reportTypes = [
    { title: "Monthly circularity report", description: "Collection, recovery, and SDG outcomes", icon: Recycle },
    { title: "Market performance report", description: "SLA and participation by market", icon: Store },
    { title: "Partner compliance report", description: "Recycler activity and proof records", icon: ShieldCheck },
  ];
  return <div className="space-y-7"><PageHeader eyebrow="BBMP intelligence" title="Reports" description="Create presentation-ready operational and environmental reports." action={<Button disabled={Boolean(generating)} onClick={() => generate("dashboard", "EcoLoop dashboard report")}><FileBarChart className="size-4" /> {generating ? "Generating…" : "Generate report"}</Button>} /><div className="grid gap-4 md:grid-cols-3">{reportTypes.map(item => <Panel key={item.title}><div className="p-5"><span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"><item.icon className="size-5" /></span><h2 className="mt-6 text-sm font-semibold">{item.title}</h2><p className="mt-2 text-xs leading-5 text-slate-500">{item.description}</p><div className="mt-6 flex gap-2"><Button size="sm" variant="outline" disabled={Boolean(generating)} onClick={() => generate("PDF", item.title)}><Download className="size-3.5" /> PDF</Button><Button size="sm" variant="outline" disabled={Boolean(generating)} onClick={() => generate("CSV", item.title)}><Download className="size-3.5" /> CSV</Button></div></div></Panel>)}</div><Panel title="Generated this session">{reports.length ? <div className="divide-y divide-slate-100 dark:divide-slate-800">{reports.map((report, index) => <div key={`${report.filename}-${index}`} className="flex items-center gap-3 px-5 py-4"><span className="grid size-9 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800"><FileBarChart className="size-4 text-slate-500" /></span><div className="flex-1"><p className="text-xs font-semibold">{report.title}</p><p className="mt-1 text-[10px] text-slate-400">Generated {report.createdAt} · {report.format}</p></div><Button size="sm" variant="ghost" aria-label={`Download ${report.title}`} onClick={() => download(report.blob, report.filename)}><Download className="size-4" /></Button></div>)}</div> : <EmptyState icon={<FileBarChart className="size-5" />} title="No reports generated yet" description="Choose PDF or CSV above to create a report from live Supabase data." />}</Panel>{toast && <Toast message={toast} onClose={() => setToast("")} />}</div>;
}

function AdminSettingsPage() {
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [current, setCurrent] = useState<Awaited<ReturnType<typeof authService.getCurrentProfile>> | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AdminSettingsValues>({
    resolver: zodResolver(adminSettingsSchema),
    defaultValues: { name: "", market: "", email: "", phone: "" },
  });

  useEffect(() => {
    let active = true;
    authService.getCurrentProfile().then((profile) => {
      if (!active) return;
      setCurrent(profile);
      reset({ name: profile.name, market: profile.market, email: profile.email, phone: profile.phone });
    }).catch((reason) => {
      if (active) setError(reason instanceof Error ? reason.message : "Your profile could not be loaded.");
    }).finally(() => {
      if (active) setLoadingProfile(false);
    });
    return () => { active = false; };
  }, [reset]);

  useEffect(() => () => {
    if (profileImagePreview) URL.revokeObjectURL(profileImagePreview);
  }, [profileImagePreview]);

  const selectProfileImage = (file?: File) => {
    setError("");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Use a JPG, PNG, or WEBP profile image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("The profile image must be 5 MB or smaller.");
      return;
    }
    setProfileImage(file);
    setProfileImagePreview(URL.createObjectURL(file));
  };

  const submit = async (values: AdminSettingsValues) => {
    if (!current) return;
    setError("");
    try {
      const profileImageUrl = profileImage ? await authService.uploadProfileImage(profileImage) : current.profileImageUrl;
      const result = await authService.updateProfile({
        ...values,
        organization: current.organization,
        profileImageUrl,
      });
      setCurrent((profile) => profile ? { ...profile, ...result.profile } : profile);
      setProfileImage(null);
      setToast(result.emailChangePending ? "Check your inbox to confirm the new email address." : "Your settings have been saved.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your settings could not be saved.");
    }
  };

  if (loadingProfile) return <div className="space-y-4 sm:space-y-7"><PageHeader eyebrow="Workspace administration" title="Settings" description="Manage account details, notification preferences, and security." /><div className="grid gap-3 sm:gap-5 xl:grid-cols-[.7fr_1.3fr]"><div className="h-40 animate-pulse rounded-xl bg-white dark:bg-slate-900 sm:h-64 sm:rounded-2xl" /><div className="h-64 animate-pulse rounded-xl bg-white dark:bg-slate-900 sm:h-80 sm:rounded-2xl" /></div></div>;

  const displayName = current?.name || "BBMP account";
  const imageUrl = profileImagePreview || current?.profileImageUrl;
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "BA";

  return (
    <div className="space-y-4 sm:space-y-7">
      <PageHeader eyebrow="Workspace administration" title="Settings" description="Manage account details, notification preferences, and security." />
      <form onSubmit={handleSubmit(submit)} className="grid gap-3 sm:gap-5 xl:grid-cols-[.7fr_1.3fr]" noValidate>
        <Panel>
          <div className="p-4 text-center sm:p-6">
            {imageUrl ? <Image src={imageUrl} alt={`${displayName} profile`} width={80} height={80} unoptimized className="mx-auto size-16 rounded-xl object-cover sm:size-20 sm:rounded-2xl" /> : <span className="mx-auto grid size-16 place-items-center rounded-xl bg-emerald-600 text-lg font-bold text-white sm:size-20 sm:rounded-2xl sm:text-xl">{initials}</span>}
            <h2 className="mt-2.5 text-sm font-semibold sm:mt-4">{displayName}</h2>
            <p className="mt-1 text-xs text-slate-500">{current?.market || "BBMP administrator"}</p>
            <StatusBadge status="Active" />
            <label className="mx-auto mt-2.5 flex w-fit cursor-pointer items-center gap-1.5 text-[10px] font-semibold text-emerald-600 sm:mt-4 sm:gap-2"><Upload className="size-3.5" /> Upload profile image<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => selectProfileImage(event.target.files?.[0])} /></label>
            <p className="mt-1 text-[9px] text-slate-400">JPG, PNG, or WEBP · maximum 5 MB</p>
          </div>
        </Panel>
        <div className="space-y-3 sm:space-y-5">
          <Panel title="Profile details">
            <div className="grid gap-3 p-4 sm:grid-cols-2 sm:gap-4 sm:p-6">
              <label className={labelClass}>Full name<input {...register("name")} className={`${inputClass} mt-1.5 h-10 text-sm sm:mt-2 sm:h-11`} />{errors.name && <span className="mt-1 block text-[10px] text-rose-600 sm:mt-1.5">{errors.name.message}</span>}</label>
              <label className={labelClass}>Employee ID<input value={current?.officeId || "Not provided during signup"} readOnly aria-readonly="true" className={`${inputClass} mt-1.5 h-10 cursor-not-allowed bg-slate-50 text-sm text-slate-500 dark:bg-slate-900 sm:mt-2 sm:h-11`} /></label>
              <label className={labelClass}>Zone or operating area<input {...register("market")} className={`${inputClass} mt-1.5 h-10 text-sm sm:mt-2 sm:h-11`} />{errors.market && <span className="mt-1 block text-[10px] text-rose-600 sm:mt-1.5">{errors.market.message}</span>}</label>
              <label className={labelClass}>Phone<input {...register("phone")} className={`${inputClass} mt-1.5 h-10 text-sm sm:mt-2 sm:h-11`} />{errors.phone && <span className="mt-1 block text-[10px] text-rose-600 sm:mt-1.5">{errors.phone.message}</span>}</label>
              <label className={labelClass}>Email<input {...register("email")} type="email" className={`${inputClass} mt-1.5 h-10 text-sm sm:mt-2 sm:h-11`} />{errors.email && <span className="mt-1 block text-[10px] text-rose-600 sm:mt-1.5">{errors.email.message}</span>}</label>
            </div>
          </Panel>
          <Panel title="Security"><div className="p-4 sm:flex sm:items-center sm:gap-4 sm:p-6"><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 sm:size-10 sm:rounded-xl"><KeyRound className="size-4 sm:size-[18px]" /></span><div className="flex-1"><p className="text-xs font-semibold">Password</p><p className="mt-0.5 text-[10px] leading-4 text-slate-400 sm:mt-1">Use the login page if you need to reset your password.</p></div></div><Button type="button" size="sm" variant="outline" className="mt-3 w-full sm:mt-0 sm:w-auto" asChild><Link href="/login">Reset password</Link></Button></div></Panel>
          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2.5 text-[11px] text-rose-700 sm:px-4 sm:py-3 sm:text-xs">{error}</p>}
          <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || !current}><Save className="size-4" /> {isSubmitting ? "Saving…" : "Save changes"}</Button>
        </div>
      </form>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}

function ProfilePage({ role, settings = false }: { role: DashboardRole; settings?: boolean }) {
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [current, setCurrent] = useState<Awaited<ReturnType<typeof authService.getCurrentProfile>> | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");
  const { register: formRegister, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues: { name: "", organization: "", market: "", email: "", phone: "" } });
  const register = (name: keyof ProfileValues) => {
    const registration = formRegister(name);
    return role === "admin" && name === "organization" ? { ...registration, readOnly: true, "aria-label": "Account ID" } : registration;
  };
  useEffect(() => {
    let active = true;
    authService.getCurrentProfile().then((current) => {
      if (active) {
        setCurrent(current);
        reset({ name: current.name, organization: role === "admin" ? `Account ID: ${current.id}` : current.organization, market: current.market, email: current.email, phone: current.phone });
      }
    }).catch((reason) => {
      if (active) setError(reason instanceof Error ? reason.message : "Your profile could not be loaded.");
    }).finally(() => {
      if (active) setLoadingProfile(false);
    });
    return () => { active = false; };
  }, [reset, role]);
  useEffect(() => () => { if (profileImagePreview) URL.revokeObjectURL(profileImagePreview); }, [profileImagePreview]);
  const selectProfileImage = (file?: File) => {
    setError("");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Use a JPG, PNG, or WEBP profile image."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("The profile image must be 5 MB or smaller."); return; }
    setProfileImage(file);
    setProfileImagePreview(URL.createObjectURL(file));
  };
  const submit = async (values: ProfileValues) => {
    setError("");
    try {
      const profileImageUrl = profileImage ? await authService.uploadProfileImage(profileImage) : current?.profileImageUrl;
      const result = await authService.updateProfile({ ...values, organization: role === "admin" ? current?.organization ?? "" : values.organization, profileImageUrl });
      setCurrent((existing) => existing ? { ...existing, ...result.profile } : existing);
      setProfileImage(null);
      setToast(result.emailChangePending ? "Check your inbox to confirm the new email address." : "Your settings have been saved.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your settings could not be saved.");
    }
  };
  if (loadingProfile) return <div className="space-y-3 sm:space-y-7"><PageHeader eyebrow={settings ? "Workspace administration" : "Account"} title={settings ? "Settings" : "Profile"} description="Manage account details, notification preferences, and security." /><div className="grid gap-3 sm:gap-5 xl:grid-cols-[.7fr_1.3fr]"><div className="h-40 animate-pulse rounded-xl sm:h-64 sm:rounded-2xl bg-white dark:bg-slate-900" /><div className="h-56 animate-pulse rounded-xl sm:h-80 sm:rounded-2xl bg-white dark:bg-slate-900" /></div></div>;
  const displayName = current?.name || "EcoLoop account";
  const displayOrganization = role === "admin" ? current?.market || "BBMP administrator" : current?.organization || current?.market || roleProfiles[role].shortRole;
  const imageUrl = profileImagePreview || current?.profileImageUrl;
  return <div className="space-y-3 sm:space-y-7"><PageHeader eyebrow={settings ? "Workspace administration" : "Account"} title={settings ? "Settings" : "Profile"} description="Manage account details, notification preferences, and security." /><form onSubmit={handleSubmit(submit)} className="grid gap-3 sm:gap-5 xl:grid-cols-[.7fr_1.3fr]" noValidate><Panel><div className="p-4 text-center sm:p-6">{imageUrl ? <Image src={imageUrl} alt={`${displayName} profile`} width={80} height={80} unoptimized className="mx-auto size-16 rounded-xl object-cover sm:size-20 sm:rounded-2xl" /> : <span className="mx-auto grid size-16 place-items-center rounded-xl sm:size-20 sm:rounded-2xl bg-emerald-600 text-lg font-bold text-white sm:text-xl">{displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>}<h2 className="mt-2.5 text-sm sm:mt-4 font-semibold">{displayName}</h2><p className="mt-1 text-xs text-slate-500">{displayOrganization}</p><StatusBadge status="Active" /><label className="mx-auto mt-2.5 flex w-fit sm:mt-4 cursor-pointer items-center gap-2 text-[10px] font-semibold text-emerald-600"><Upload className="size-3.5" /> Upload profile image<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => selectProfileImage(event.target.files?.[0])} /></label><p className="mt-1 text-[9px] text-slate-400">JPG, PNG, or WEBP · maximum 5 MB</p></div></Panel><div className="space-y-3 sm:space-y-5"><Panel title="Profile details"><div className="grid gap-3 p-4 sm:grid-cols-2 sm:gap-4 sm:p-6"><label className={labelClass}>Full name<input {...register("name")} className={`${inputClass} mt-1.5 h-10 text-sm sm:mt-2 sm:h-11`} />{errors.name && <span className="mt-1 block text-[10px] sm:mt-1.5 text-rose-600">{errors.name.message}</span>}</label><label className={labelClass}>Organization<input {...register("organization")} className={`${inputClass} mt-1.5 h-10 text-sm sm:mt-2 sm:h-11`} />{errors.organization && <span className="mt-1 block text-[10px] sm:mt-1.5 text-rose-600">{errors.organization.message}</span>}</label><label className={labelClass}>Market or operating area<input {...register("market")} className={`${inputClass} mt-1.5 h-10 text-sm sm:mt-2 sm:h-11`} />{errors.market && <span className="mt-1 block text-[10px] sm:mt-1.5 text-rose-600">{errors.market.message}</span>}</label><label className={labelClass}>Phone<input {...register("phone")} className={`${inputClass} mt-1.5 h-10 text-sm sm:mt-2 sm:h-11`} />{errors.phone && <span className="mt-1 block text-[10px] sm:mt-1.5 text-rose-600">{errors.phone.message}</span>}</label><label className={labelClass}>Email<input {...register("email")} type="email" className={`${inputClass} mt-1.5 h-10 text-sm sm:mt-2 sm:h-11`} />{errors.email && <span className="mt-1 block text-[10px] sm:mt-1.5 text-rose-600">{errors.email.message}</span>}</label></div></Panel><Panel title="Notifications"><div className="divide-y divide-slate-100 px-4 dark:divide-slate-800 sm:px-6">{[{ i: Bell, t: "Pickup updates", d: "Status, recycler assignment, and ETA changes" }, { i: FileBarChart, t: "Weekly summaries", d: "Performance and impact digest every Monday" }].map((item,i) => <label key={item.t} className="flex cursor-pointer items-center gap-2.5 py-3 sm:gap-3 sm:py-4"><span className="grid size-8 place-items-center rounded-lg sm:size-9 sm:rounded-xl bg-slate-100 dark:bg-slate-800"><item.i className="size-4" /></span><span className="flex-1"><span className="block text-xs font-semibold">{item.t}</span><span className="mt-1 block text-[10px] text-slate-400">{item.d}</span></span><input type="checkbox" defaultChecked={i === 0} className="size-4 accent-emerald-600" /></label>)}</div></Panel><Panel title="Security"><div className="flex flex-col gap-3 p-4 sm:flex-row sm:gap-4 sm:items-center sm:p-6"><span className="grid size-9 place-items-center rounded-lg sm:size-10 sm:rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10"><KeyRound className="size-[18px]" /></span><div className="flex-1"><p className="text-xs font-semibold">Password</p><p className="mt-1 text-[10px] text-slate-400">Use the login page if you need to reset your password.</p></div><Button type="button" size="sm" variant="outline" className="w-full sm:w-auto" asChild><Link href="/login">Reset password</Link></Button></div></Panel>{error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2.5 text-[11px] sm:px-4 sm:py-3 sm:text-xs text-rose-700">{error}</p>}<Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}><Save className="size-4" /> {isSubmitting ? "Saving…" : "Save changes"}</Button></div></form>{toast && <Toast message={toast} onClose={() => setToast("")} />}</div>;
}

function UnknownSection() { return <Panel><EmptyState icon={<Route className="size-5" />} title="Page not found" description="This workspace section is not available for the selected role." /></Panel>; }
