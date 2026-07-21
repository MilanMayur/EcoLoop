"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowRight,
  Check,
  ClipboardCheck,
  Clock3,
  Gauge,
  Mail,
  MapPin,
  Navigation,
  Pencil,
  Phone,
  Plus,
  Recycle,
  Route,
  ShieldCheck,
  Trash2,
  Truck,
  UserRound,
  UsersRound,
  Warehouse,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/dashboard/primitives";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { driverService } from "@/services/driver.service";
import { pickupService } from "@/services/pickup.service";
import type { Driver, DriverInput, PickupJob } from "@/types/mvp";
import { cn } from "@/lib/utils";
import { LivePickupTracking } from "@/components/dashboard/live-tracking";
import { usePickupRealtime } from "@/hooks/use-pickup-realtime";
import { OPERATING_HOURS_LABEL } from "@/lib/operating-hours";
import { PickupCancellationDialog } from "@/components/dashboard/pickup-cancellation-dialog";

const inputClass =
  "mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:text-sm";
const labelClass = "text-xs font-semibold text-slate-700 dark:text-slate-300";
const wasteTypes = ["Wet", "Dry", "Plastic", "Metal", "Mixed"];

const driverSchema = z.object({
  name: z.string().trim().min(2, "Enter the driver's name."),
  email: z.string().trim().email("Enter a valid email."),
  phone: z.string().trim().min(10, "Enter a valid phone number."),
  vehicleNumber: z.string().trim().min(4, "Enter the vehicle number."),
  vehicleType: z.string().trim().min(2, "Enter the vehicle type."),
  capacityKg: z.coerce.number().positive("Capacity must be greater than zero."),
  compatibleWasteTypes: z
    .array(z.string())
    .min(1, "Select at least one waste type."),
});
type DriverValues = z.infer<typeof driverSchema>;
type DriverInputValues = z.input<typeof driverSchema>;

const collectionSchema = z.object({
  actualWeight: z.coerce.number().positive("Enter the measured weight."),
  notes: z.string().trim().max(500).optional(),
});
type CollectionValues = z.infer<typeof collectionSchema>;
type CollectionInputValues = z.input<typeof collectionSchema>;

const unloadSchema = z.object({
  facility: z.string().trim().min(2, "Enter the destination facility."),
  notes: z.string().trim().max(500).optional(),
});
type UnloadValues = z.infer<typeof unloadSchema>;
type UnloadInputValues = z.input<typeof unloadSchema>;

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div
      role="status"
      className="fixed bottom-24 right-3 z-[90] flex max-w-[calc(100vw-1.5rem)] items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 shadow-2xl dark:border-emerald-900 dark:bg-slate-900 sm:bottom-5 sm:right-5 sm:rounded-2xl"
    >
      <Check className="size-4 text-emerald-600" />
      <p className="text-xs font-medium">{message}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close message"
        className="ml-2 text-slate-400"
      >
        ×
      </button>
    </div>
  );
}

export function AssignmentQueuePage() {
  const overview = useAsyncResource(
    () => driverService.getFleetOverview(),
    "assignment-queue-overview",
  );
  const assignments = useAsyncResource(
    () => driverService.getAssignedJobs("partner"),
    "assignment-queue-jobs",
  );
  usePickupRealtime(assignments.reload);
  const [processing, setProcessing] = useState(false);
  const [savingWindow, setSavingWindow] = useState(false);
  const [batchingWindowOverride, setBatchingWindowOverride] = useState<number | null>(null);
  const batchingWindow = batchingWindowOverride ?? overview.data?.batchingWindowSeconds ?? 30;
  const operatingNow = overview.data?.operatingNow ?? true;
  const [toast, setToast] = useState("");
  const process = async () => {
    setProcessing(true);
    try {
      const count = await driverService.processReadyBatches();
      await Promise.all([overview.reload(), assignments.reload()]);
      setToast(
        count
          ? `${count} pickup${count === 1 ? "" : "s"} assigned.`
          : "No pickup batches are ready yet.",
      );
    } catch (error) {
      setToast(
        error instanceof Error
          ? error.message
          : "The assignment queue could not be processed.",
      );
    } finally {
      setProcessing(false);
    }
  };
  const saveWindow = async (seconds: number) => {
    setBatchingWindowOverride(seconds);
    setSavingWindow(true);
    try {
      await driverService.updateBatchingWindow(seconds);
      overview.setData(
        overview.data
          ? { ...overview.data, batchingWindowSeconds: seconds }
          : null,
      );
      setToast(`Batching window updated to ${seconds} seconds.`);
    } catch (error) {
      setBatchingWindowOverride(null);
      setToast(
        error instanceof Error
          ? error.message
          : "The batching window could not be updated.",
      );
    } finally {
      setSavingWindow(false);
    }
  };
  const steps = [
    "Pickup request received",
    `Wait ${batchingWindow} seconds`,
    "Group nearby market requests",
    "Score active trucks",
    "Assign driver and route order",
  ];
  return (
    <div className="space-y-4 sm:space-y-7">
      <PageHeader
        eyebrow="Smart logistics"
        title="Assignment queue"
        description={`EcoLoop assigns queued requests during operating hours (${OPERATING_HOURS_LABEL}).`}
        action={
          <div className="flex w-full gap-2 sm:w-auto">
            <label className="sr-only" htmlFor="batching-window">
              Batching window
            </label>
            <select
              id="batching-window"
              value={batchingWindow}
              disabled={savingWindow}
              onChange={(event) => void saveWindow(Number(event.target.value))}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900"
            >
              <option value={30}>30 sec</option>
              <option value={45}>45 sec</option>
              <option value={60}>60 sec</option>
            </select>
            <Button
              className="flex-1 sm:flex-none"
              onClick={() => void process()}
              disabled={processing || !operatingNow}
              title={
                operatingNow
                  ? "Process ready pickup batches"
                  : `Assignments resume at 6:00 AM IST (${OPERATING_HOURS_LABEL})`
              }
            >
              <Route className="size-4" />
              {processing
                ? "Processing…"
                : operatingNow
                  ? "Process ready batches"
                  : "Assignments paused"}
            </Button>
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
        {(
          [
            ["Batching window", `${batchingWindow}s`, Clock3],
            [
              "Active trucks",
              overview.data?.availableDrivers ?? 0,
              UsersRound,
            ],
            ["Active assignments", overview.data?.activeJobs ?? 0, Navigation],
            [
              "Fleet capacity",
              `${Math.round(overview.data?.totalCapacityKg ?? 0)} kg`,
              Gauge,
            ],
          ] as Array<[string, string | number, LucideIcon]>
        ).map(([label, value, Icon]) => (
          <Panel key={label}>
            <div className="p-3.5 sm:p-5">
              <Icon className="size-4 text-emerald-600" />
              <p className="mt-3 text-xl font-semibold">{value}</p>
              <p className="mt-1 text-[10px] text-slate-500">{label}</p>
            </div>
          </Panel>
        ))}
      </div>
      <Panel
        title="How batching works"
        subtitle="Configured in Supabase and processed automatically"
      >
        <div className="grid gap-2 p-3 sm:grid-cols-5 sm:p-5">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center gap-2 sm:block">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-emerald-50 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10">
                {index + 1}
              </span>
              <p className="min-w-0 flex-1 text-[11px] font-medium sm:mt-3 sm:text-xs">
                {step}
              </p>
              {index < steps.length - 1 && (
                <ArrowRight className="hidden size-3.5 text-slate-300 sm:absolute" />
              )}
            </div>
          ))}
        </div>
      </Panel>
      <PartnerJobs
        jobs={assignments.data ?? []}
        loading={assignments.loading}
        error={assignments.error}
        title="Recently assigned jobs"
        onCancelled={assignments.reload}
      />
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}

export function DriverManagementPage() {
  const resource = useAsyncResource(
    () => driverService.getDrivers(),
    "drivers",
  );
  const performance = useAsyncResource(
    () => driverService.getPerformance(),
    "driver-performance",
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DriverInputValues, unknown, DriverValues>({
    resolver: zodResolver(driverSchema),
    defaultValues: { compatibleWasteTypes: ["Wet", "Dry"] },
  });
  const openCreate = () => {
    setEditing(null);
    setError("");
    reset({
      name: "",
      email: "",
      phone: "",
      vehicleNumber: "",
      vehicleType: "Mini truck",
      capacityKg: 500,
      compatibleWasteTypes: ["Wet", "Dry"],
    });
    setOpen(true);
  };
  const openEdit = (driver: Driver) => {
    setEditing(driver);
    setError("");
    reset({
      name: driver.name,
      email: driver.email ?? "",
      phone: driver.phone,
      vehicleNumber: driver.vehicleNumber,
      vehicleType: driver.vehicleType,
      capacityKg: driver.capacityKg,
      compatibleWasteTypes: driver.compatibleWasteTypes,
    });
    setOpen(true);
  };
  const submit = async (values: DriverValues) => {
    setError("");
    try {
      const updated = editing
        ? await driverService.updateDriver(editing.id, {
            name: values.name,
            phone: values.phone,
            vehicleNumber: values.vehicleNumber,
            vehicleType: values.vehicleType,
            capacityKg: values.capacityKg,
            compatibleWasteTypes: values.compatibleWasteTypes,
          })
        : await driverService.inviteDriver(values as DriverInput);
      resource.setData(
        editing
          ? (resource.data ?? []).map((item) =>
              item.id === updated.id ? updated : item,
            )
          : [...(resource.data ?? []), updated],
      );
      setOpen(false);
      setToast(
        editing ? "Driver updated." : "Driver added and invitation sent.",
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The driver could not be saved.",
      );
    }
  };
  const disable = async (driver: Driver) => {
    try {
      const updated = await driverService.disableDriver(driver.id);
      resource.setData(
        (resource.data ?? []).map((item) =>
          item.id === updated.id ? updated : item,
        ),
      );
      setToast(`${driver.name} disabled.`);
    } catch (reason) {
      setToast(
        reason instanceof Error
          ? reason.message
          : "The driver could not be disabled.",
      );
    }
  };
  const performanceByDriver = new Map(
    (performance.data ?? []).map((item) => [item.driverId, item]),
  );
  return (
    <div className="space-y-4 sm:space-y-7">
      <PageHeader
        eyebrow="Fleet operations"
        title="Driver management"
        description="Manage driver access, vehicle capacity, availability, and performance."
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Add driver
          </Button>
        }
      />
      {resource.loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="h-56 animate-pulse rounded-xl bg-white dark:bg-slate-900"
            />
          ))}
        </div>
      ) : resource.error ? (
        <Panel>
          <div className="p-6 text-center text-xs text-rose-600">
            {resource.error}
          </div>
        </Panel>
      ) : resource.data?.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {resource.data.map((driver) => {
            const stats = performanceByDriver.get(driver.id);
            const load = Math.round(
              (driver.currentLoadKg / driver.capacityKg) * 100,
            );
            return (
              <Panel key={driver.id}>
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10">
                      <UserRound className="size-[18px]" />
                    </span>
                    <StatusBadge status={driver.status} />
                  </div>
                  <h2 className="mt-4 text-sm font-semibold">{driver.name}</h2>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {driver.vehicleNumber} · {driver.vehicleType}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                    <div>
                      <p className="text-[9px] text-slate-400">Capacity</p>
                      <p className="mt-1 text-xs font-semibold">
                        {driver.capacityKg} kg
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400">Completion</p>
                      <p className="mt-1 text-xs font-semibold">
                        {stats?.completionRate ?? 0}%
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-[9px] text-slate-400">
                      <span>Onboard load</span>
                      <span>{load}%</span>
                    </div>
                    <p className="mt-1.5 text-[9px] text-slate-400">
                      {driver.currentLoadKg} kg onboard · {driver.reservedLoadKg} kg reserved
                    </p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.min(load, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => openEdit(driver)}
                    >
                      <Pencil className="size-3.5" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={driver.status === "Disabled"}
                      onClick={() => void disable(driver)}
                    >
                      <Trash2 className="size-3.5 text-rose-500" /> Disable
                    </Button>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      ) : (
        <Panel>
          <EmptyState
            icon={<UsersRound className="size-5" />}
            title="No drivers yet"
            description="Add your first driver to enable Smart Auto Assignment."
            action={
              <Button onClick={openCreate}>
                <Plus className="size-4" /> Add driver
              </Button>
            }
          />
        </Panel>
      )}
      {open && (
        <div
          className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="driver-dialog-title"
        >
          <form
            onSubmit={handleSubmit(submit)}
            className="my-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  Fleet member
                </p>
                <h2
                  id="driver-dialog-title"
                  className="mt-1 text-xl font-semibold"
                >
                  {editing ? "Edit driver" : "Add driver"}
                </h2>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setOpen(false)}
                aria-label="Close driver form"
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Field label="Driver name" error={errors.name?.message}>
                <input {...register("name")} className={inputClass} />
              </Field>
              <Field label="Driver email" error={errors.email?.message}>
                <input
                  {...register("email")}
                  type="email"
                  readOnly={Boolean(editing)}
                  className={cn(
                    inputClass,
                    editing && "bg-slate-50 text-slate-400",
                  )}
                />
              </Field>
              <Field label="Phone" error={errors.phone?.message}>
                <input
                  {...register("phone")}
                  type="tel"
                  className={inputClass}
                />
              </Field>
              <Field
                label="Vehicle number"
                error={errors.vehicleNumber?.message}
              >
                <input {...register("vehicleNumber")} className={inputClass} />
              </Field>
              <Field label="Vehicle type" error={errors.vehicleType?.message}>
                <input {...register("vehicleType")} className={inputClass} />
              </Field>
              <Field label="Capacity (kg)" error={errors.capacityKg?.message}>
                <input
                  {...register("capacityKg")}
                  type="number"
                  min="1"
                  className={inputClass}
                />
              </Field>
            </div>
            <fieldset className="mt-4">
              <legend className={labelClass}>Compatible waste types *</legend>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {wasteTypes.map((type) => (
                  <label
                    key={type}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 text-[10px] font-medium dark:border-slate-700"
                  >
                    <input
                      {...register("compatibleWasteTypes")}
                      type="checkbox"
                      value={type}
                      className="accent-emerald-600"
                    />
                    {type}
                  </label>
                ))}
              </div>
              {errors.compatibleWasteTypes && (
                <p className="mt-1.5 text-[10px] text-rose-600">
                  {errors.compatibleWasteTypes.message}
                </p>
              )}
            </fieldset>
            {!editing && (
              <div className="mt-4 flex gap-2 rounded-xl bg-blue-50 p-3 text-[10px] leading-4 text-blue-800">
                <Mail className="size-4 shrink-0" />
                The driver receives a Supabase invitation and creates their
                password securely.
              </div>
            )}
            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700"
              >
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="mt-5 w-full"
            >
              {isSubmitting
                ? "Saving…"
                : editing
                  ? "Save driver"
                  : "Add and invite driver"}
            </Button>
          </form>
        </div>
      )}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={labelClass}>
      {label} *{children}
      {error && (
        <span className="mt-1.5 block text-[10px] text-rose-600">{error}</span>
      )}
    </label>
  );
}

export function PartnerAssignedJobsPage() {
  const resource = useAsyncResource(
    () => driverService.getAssignedJobs("partner"),
    "partner-assigned-jobs",
  );
  usePickupRealtime(resource.reload);
  return (
    <div className="space-y-4 sm:space-y-7">
      <PageHeader
        eyebrow="Fleet operations"
        title="Assigned jobs"
        description="Monitor assignments while drivers execute each collection."
      />
      <PartnerJobs
        jobs={resource.data ?? []}
        loading={resource.loading}
        error={resource.error}
        title="Active driver assignments"
        onCancelled={resource.reload}
      />
    </div>
  );
}

export function RecyclerFleetOverview({ jobs }: { jobs: PickupJob[] }) {
  const fleet = useAsyncResource(
    () => driverService.getFleetOverview(),
    "recycler-home-fleet",
  );
  const ordered = [...jobs].sort(
    (a, b) => (a.routeStopOrder ?? 99) - (b.routeStopOrder ?? 99),
  );
  const trackedJob = ordered.find(
    (job) =>
      job.assignedDriverId &&
      ["Assigned", "Accepted", "In transit", "Arrived", "Collected"].includes(
        job.status ?? "",
      ),
  );
  return (
    <div className="space-y-4 sm:space-y-5">
      {trackedJob && (
        <LivePickupTracking
          driverId={trackedJob.assignedDriverId}
          status={trackedJob.status}
          destinationLatitude={trackedJob.vendorLatitude}
          destinationLongitude={trackedJob.vendorLongitude}
        />
      )}
    <div className="grid gap-4 xl:grid-cols-[1.45fr_.55fr] xl:gap-5">
      <Panel
        title="Active driver assignments"
        subtitle="Live pickup execution across your fleet"
        action={
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/recycler/accepted">View assigned jobs</Link>
          </Button>
        }
      >
        {ordered.length ? (
          <div className="divide-y divide-slate-100 p-2 dark:divide-slate-800">
            {ordered.slice(0, 6).map((job) => (
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
                    {job.assignedDriver ?? "Assigned driver"} ·{" "}
                    {job.assignedVehicle ?? "Vehicle"}
                  </p>
                </div>
                <StatusBadge status={job.status ?? "Assigned"} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<ClipboardCheck className="size-5" />}
            title="No active assignments"
            description="Requests will appear after the configured batching window and Smart Assignment."
          />
        )}
      </Panel>
      <Panel
        title="Fleet availability"
        subtitle={`Operating hours: ${OPERATING_HOURS_LABEL}`}
      >
        {fleet.loading ? (
          <div className="h-44 animate-pulse bg-slate-50 dark:bg-slate-950" />
        ) : fleet.error || !fleet.data ? (
          <p className="p-6 text-center text-xs text-rose-600">
            {fleet.error || "Fleet data is unavailable."}
          </p>
        ) : (
          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                <p className="text-xl font-semibold">
                  {fleet.data.availableDrivers}
                </p>
                <p className="mt-1 text-[10px] text-slate-400">
                  Active trucks
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                <p className="text-xl font-semibold">{fleet.data.activeJobs}</p>
                <p className="mt-1 text-[10px] text-slate-400">Active jobs</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Onboard · reserved</span>
              <span className="font-semibold">
                {Math.round(fleet.data.currentLoadKg)} kg · {Math.round(fleet.data.reservedLoadKg)} kg /{" "}
                {Math.round(fleet.data.totalCapacityKg)} kg
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{
                  width: `${fleet.data.totalCapacityKg ? Math.min(100, ((fleet.data.currentLoadKg + fleet.data.reservedLoadKg) / fleet.data.totalCapacityKg) * 100) : 0}%`,
                }}
              />
            </div>
            <Button asChild className="mt-5 w-full" size="sm">
              <Link href="/dashboard/recycler/drivers">Manage drivers</Link>
            </Button>
          </div>
        )}
      </Panel>
    </div>
    </div>
  );
}

function PartnerJobs({
  jobs,
  loading,
  error,
  title,
  onCancelled,
}: {
  jobs: PickupJob[];
  loading: boolean;
  error: string;
  title: string;
  onCancelled?: () => void;
}) {
  const [cancellationTarget, setCancellationTarget] = useState<PickupJob | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancellationError, setCancellationError] = useState("");
  const [toast, setToast] = useState("");

  const cancelPickup = async (reason?: string) => {
    if (!cancellationTarget || !reason) return;
    setCancelling(true);
    setCancellationError("");
    try {
      await pickupService.cancelPickup(cancellationTarget.id, reason);
      setToast(`Pickup ${cancellationTarget.id} was cancelled and removed from the route.`);
      setCancellationTarget(null);
      onCancelled?.();
    } catch (cause) {
      setCancellationError(
        cause instanceof Error ? cause.message : "The pickup could not be cancelled.",
      );
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <Panel
        title={title}
        subtitle="Status updates come from the assigned driver"
      >
        {loading ? (
          <div className="h-48 animate-pulse bg-slate-50 dark:bg-slate-950" />
        ) : error ? (
          <p className="p-6 text-center text-xs text-rose-600">{error}</p>
        ) : jobs.length ? (
          <div className="grid gap-2.5 p-3 sm:p-5">
            {jobs.map((job) => {
              const canCancel = ["Assigned", "Accepted", "In transit", "Arrived"].includes(
                job.status ?? "",
              );
              return (
                <article
                  key={job.id}
                  className="rounded-xl border border-slate-100 p-3.5 dark:border-slate-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Stop {job.routeStopOrder ?? "—"}
                      </p>
                      <h3 className="mt-1 text-xs font-semibold">{job.vendor}</h3>
                    </div>
                    <StatusBadge status={job.status ?? "Assigned"} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-[10px] sm:grid-cols-4">
                    {[
                      ["Driver", job.assignedDriver ?? "Assigned driver"],
                      ["Vehicle", job.assignedVehicle ?? "—"],
                      ["Waste", `${job.waste} · ${job.fillLevel}`],
                      ["Location", job.location],
                    ].map(([key, value]) => (
                      <div key={key}>
                        <p className="text-slate-400">{key}</p>
                        <p className="mt-1 font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>
                  {onCancelled && (
                    <div className="mt-3 flex justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
                      {canCancel ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:text-rose-300 dark:hover:bg-rose-500/10"
                          onClick={() => {
                            setCancellationError("");
                            setCancellationTarget(job);
                          }}
                        >
                          Cancel for operational issue
                        </Button>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          Cancellation unavailable after collection
                        </span>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<ClipboardCheck className="size-5" />}
            title="No active assignments"
            description="Ready pickup batches will appear after Smart Auto Assignment runs."
          />
        )}
      </Panel>
      <PickupCancellationDialog
        open={Boolean(cancellationTarget)}
        role="recycler"
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
    </>
  );
}

export function FleetOverviewPage() {
  const resource = useAsyncResource(async () => {
    const [overview, drivers, performance] = await Promise.all([
      driverService.getFleetOverview(),
      driverService.getDrivers(),
      driverService.getPerformance(),
    ]);
    return { overview, drivers, performance };
  }, "fleet-overview");
  if (resource.loading)
    return (
      <div className="h-72 animate-pulse rounded-xl bg-white dark:bg-slate-900" />
    );
  if (resource.error || !resource.data)
    return (
      <Panel>
        <p className="p-6 text-center text-xs text-rose-600">
          {resource.error || "Fleet data is unavailable."}
        </p>
      </Panel>
    );
  const { overview, drivers, performance } = resource.data;
  const fleetMetrics: Array<[string, string | number, LucideIcon]> = [
    ["Drivers", overview.totalDrivers, UsersRound],
    ["Active trucks", overview.availableDrivers, ShieldCheck],
    ["Active jobs", overview.activeJobs, Navigation],
    [
      "Onboard load",
      `${Math.round(overview.currentLoadKg)} / ${Math.round(overview.totalCapacityKg)} kg`,
      Truck,
    ],
    [
      "Reserved capacity",
      `${Math.round(overview.reservedLoadKg)} kg`,
      Gauge,
    ],
  ];
  return (
    <div className="space-y-4 sm:space-y-7">
      <PageHeader
        eyebrow="Fleet operations"
        title="Fleet overview"
        description="Live vehicle capacity, availability, utilization, and driver performance."
      />
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-5">
        {fleetMetrics.map(([label, value, Icon]) => (
          <Panel key={label}>
            <div className="p-3.5 sm:p-5">
              <Icon className="size-4 text-emerald-600" />
              <p className="mt-3 text-lg font-semibold sm:text-xl">{value}</p>
              <p className="mt-1 text-[10px] text-slate-500">{label}</p>
            </div>
          </Panel>
        ))}
      </div>
      <Panel
        title="Vehicle status"
        subtitle="Capacity and availability by driver"
      >
        <div className="grid gap-2.5 p-3 md:grid-cols-2 xl:grid-cols-3 sm:p-5">
          {drivers.map((driver) => {
            const percent = Math.round(
              ((driver.currentLoadKg + driver.reservedLoadKg) /
                driver.capacityKg) *
                100,
            );
            return (
              <div
                key={driver.id}
                className="rounded-xl border border-slate-100 p-3.5 dark:border-slate-800"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold">
                      {driver.vehicleNumber}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {driver.name} · {driver.vehicleType}
                    </p>
                  </div>
                  <StatusBadge status={driver.status} />
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-[9px] text-slate-400">
                  {driver.currentLoadKg} kg onboard · {driver.reservedLoadKg} kg reserved · {driver.capacityKg} kg capacity
                </p>
              </div>
            );
          })}
        </div>
      </Panel>
      <Panel
        title="Driver performance"
        subtitle="Measured from assignment and completion timestamps"
      >
        <div className="grid gap-2.5 p-3 sm:hidden">
          {performance.map((item) => (
            <div
              key={item.driverId}
              className="rounded-xl border border-slate-100 p-3.5 dark:border-slate-800"
            >
              <p className="text-xs font-semibold">{item.name}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <p className="text-slate-400">Completed</p>
                  <p className="mt-1 font-semibold">{item.completedJobs}</p>
                </div>
                <div>
                  <p className="text-slate-400">Response</p>
                  <p className="mt-1 font-semibold">
                    {item.averageResponseMinutes ?? 0} min
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Rate</p>
                  <p className="mt-1 font-semibold">{item.completionRate}%</p>
                </div>
                <div>
                  <p className="text-slate-400">Distance</p>
                  <p className="mt-1 font-semibold">
                    {item.distanceCoveredKm} km
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[700px] text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[9px] uppercase tracking-wider text-slate-400 dark:border-slate-800">
                {[
                  "Driver",
                  "Assignments",
                  "Completed",
                  "Avg response",
                  "Avg collection",
                  "Distance",
                  "Current load",
                  "Completion",
                ].map((heading) => (
                  <th key={heading} className="px-5 py-3">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {performance.map((item) => (
                <tr
                  key={item.driverId}
                  className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                >
                  <td className="px-5 py-4 text-xs font-semibold">
                    {item.name}
                  </td>
                  <td className="px-5 py-4 text-xs">{item.totalAssignments}</td>
                  <td className="px-5 py-4 text-xs">{item.completedJobs}</td>
                  <td className="px-5 py-4 text-xs">
                    {item.averageResponseMinutes ?? 0} min
                  </td>
                  <td className="px-5 py-4 text-xs">
                    {item.averageCollectionMinutes ?? 0} min
                  </td>
                  <td className="px-5 py-4 text-xs">
                    {item.distanceCoveredKm} km
                  </td>
                  <td className="px-5 py-4 text-xs">
                    {item.vehicleUtilization}%
                  </td>
                  <td className="px-5 py-4 text-xs">{item.completionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

export function DriverWorkflowSection({ section }: { section: string }) {
  if (section === "jobs") return <DriverJobsPage />;
  if (section === "route") return <DriverRoutePage />;
  if (section === "history") return <DriverHistoryPage />;
  return (
    <Panel>
      <EmptyState
        icon={<Truck className="size-5" />}
        title="Driver page not found"
        description="Use the driver navigation to open an assigned workflow."
      />
    </Panel>
  );
}

const driverStages = [
  "Assigned",
  "Accepted",
  "In transit",
  "Arrived",
  "Collected",
  "Completed",
] as const;

function PickupStatusTimeline({ status }: { status: PickupJob["status"] }) {
  const currentIndex = Math.max(
    0,
    driverStages.indexOf(
      (status ?? "Assigned") as (typeof driverStages)[number],
    ),
  );
  return (
    <ol
      aria-label={`Pickup progress: ${status ?? "Assigned"}`}
      className="mt-4 grid grid-cols-6 gap-1"
    >
      {driverStages.map((stage, index) => (
        <li key={stage} className="min-w-0 text-center">
          <span
            className={cn(
              "mx-auto block h-1.5 rounded-full",
              index <= currentIndex
                ? "bg-emerald-500"
                : "bg-slate-200 dark:bg-slate-700",
            )}
          />
          <span
            className={cn(
              "mt-1.5 hidden text-[8px] sm:block",
              index <= currentIndex
                ? "font-semibold text-emerald-700 dark:text-emerald-400"
                : "text-slate-400",
            )}
          >
            {stage}
          </span>
        </li>
      ))}
    </ol>
  );
}

function DriverJobsPage() {
  const resource = useAsyncResource(
    () => driverService.getAssignedJobs("driver"),
    "driver-jobs",
  );
  const vehicle = useAsyncResource(
    () => driverService.getCurrentDriver(),
    "driver-current-vehicle",
  );
  usePickupRealtime(resource.reload);
  const [updating, setUpdating] = useState("");
  const [collecting, setCollecting] = useState<PickupJob | null>(null);
  const [collectionPhoto, setCollectionPhoto] = useState<File | null>(null);
  const [collectionPreview, setCollectionPreview] = useState("");
  const [unloading, setUnloading] = useState(false);
  const [unloadPhoto, setUnloadPhoto] = useState<File | null>(null);
  const [unloadPreview, setUnloadPreview] = useState("");
  const [toast, setToast] = useState("");
  const {
    register: registerCollection,
    handleSubmit: handleCollectionSubmit,
    reset: resetCollection,
    formState: {
      errors: collectionErrors,
      isSubmitting: isCollecting,
    },
  } = useForm<CollectionInputValues, unknown, CollectionValues>({
    resolver: zodResolver(collectionSchema),
    defaultValues: { notes: "" },
  });
  const {
    register: registerUnload,
    handleSubmit: handleUnloadSubmit,
    reset: resetUnload,
    formState: { errors: unloadErrors, isSubmitting: isUnloading },
  } = useForm<UnloadInputValues, unknown, UnloadValues>({
    resolver: zodResolver(unloadSchema),
    defaultValues: { facility: "", notes: "" },
  });
  useEffect(
    () => () => {
      if (collectionPreview) URL.revokeObjectURL(collectionPreview);
      if (unloadPreview) URL.revokeObjectURL(unloadPreview);
    },
    [collectionPreview, unloadPreview],
  );
  const jobs = resource.data ?? [];
  const currentVehicle = vehicle.data;
  const currentLoad = currentVehicle?.currentLoadKg ?? 0;
  const reservedLoad = currentVehicle?.reservedLoadKg ?? 0;
  const capacity = currentVehicle?.capacityKg ?? 0;
  const remainingCapacity = Math.max(0, capacity - currentLoad - reservedLoad);
  const committedPercent = capacity
    ? Math.min(100, ((currentLoad + reservedLoad) / capacity) * 100)
    : 0;
  const actualPercent = capacity
    ? Math.min(100, (currentLoad / capacity) * 100)
    : 0;
  const nearlyFull =
    capacity > 0 &&
    remainingCapacity < Math.max(capacity * 0.1, 10);
  const advance = async (job: PickupJob) => {
    if (job.status === "Arrived") {
      setCollecting(job);
      return;
    }
    if (job.status === "Collected") {
      setUnloading(true);
      return;
    }
    setUpdating(job.id);
    try {
      const updated =
        job.status === "Assigned"
          ? await driverService.acceptAssignment(job.id)
          : job.status === "Accepted"
            ? await driverService.startJourney(job.id)
            : await driverService.markArrived(job.id);
      resource.setData(
        jobs.map((item) =>
          item.id === job.id ? { ...job, ...updated } : item,
        ),
      );
      if (updated.status === "In transit") {
        window.dispatchEvent(new Event("ecoloop:start-live-tracking"));
      }
      setToast(`${job.id} updated to ${updated.status}.`);
    } catch (reason) {
      setToast(
        reason instanceof Error
          ? reason.message
          : "Pickup status could not be updated.",
      );
    } finally {
      setUpdating("");
    }
  };
  const recordCollection = async (values: CollectionValues) => {
    if (!collecting) return;
    try {
      const collectionImageUrl = collectionPhoto
        ? await pickupService.uploadPickupImage(collectionPhoto, "completion")
        : undefined;
      const updated = await driverService.collectWaste(collecting.id, {
        ...values,
        collectionImageUrl,
      });
      resource.setData(
        jobs.map((item) =>
          item.id === collecting.id ? { ...item, ...updated } : item,
        ),
      );
      vehicle.reload();
      setCollecting(null);
      setCollectionPhoto(null);
      setCollectionPreview("");
      resetCollection();
      setToast(
        `${values.actualWeight} kg added to the vehicle. It remains onboard until facility unload.`,
      );
    } catch (reason) {
      setToast(
        reason instanceof Error
          ? reason.message
          : "Collected waste could not be recorded.",
      );
    }
  };
  const unloadVehicle = async (values: UnloadValues) => {
    try {
      const imageUrl = unloadPhoto
        ? await pickupService.uploadPickupImage(unloadPhoto, "completion")
        : undefined;
      const result = await driverService.unloadVehicle({ ...values, imageUrl });
      const remainingJobs = jobs.filter((item) => item.status !== "Collected");
      resource.setData(remainingJobs);
      vehicle.reload();
      if (!remainingJobs.length) {
        window.dispatchEvent(new Event("ecoloop:stop-live-tracking"));
      }
      setUnloading(false);
      setUnloadPhoto(null);
      setUnloadPreview("");
      resetUnload();
      setToast(
        `${result.totalWeightKg} kg delivered to ${result.facility}. Vehicle load updated.`,
      );
    } catch (reason) {
      setToast(
        reason instanceof Error
          ? reason.message
          : "The vehicle unload could not be recorded.",
      );
    }
  };
  return (
    <div className="space-y-4 sm:space-y-7">
      <PageHeader
        eyebrow="Today's route"
        title="Assigned pickups"
        description="Collected waste remains onboard until you record delivery at the destination facility."
      />
      <Panel
        title="Vehicle load"
        subtitle={
          currentVehicle
            ? `${currentVehicle.vehicleNumber} · ${currentVehicle.vehicleType}`
            : "Loading vehicle capacity"
        }
        action={
          <Button
            size="sm"
            disabled={!currentVehicle || currentLoad <= 0}
            onClick={() => setUnloading(true)}
          >
            <Warehouse className="size-4" /> Unload at facility
          </Button>
        }
      >
        {vehicle.loading ? (
          <div className="h-28 animate-pulse bg-slate-50 dark:bg-slate-950" />
        ) : vehicle.error ? (
          <p className="p-5 text-center text-xs text-rose-600">{vehicle.error}</p>
        ) : (
          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-3 gap-2">
              {[
                ["Onboard", `${Math.round(currentLoad)} kg`],
                ["Reserved", `${Math.round(reservedLoad)} kg`],
                ["Remaining", `${Math.round(remainingCapacity)} kg`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                  <p className="text-base font-semibold sm:text-xl">{value}</p>
                  <p className="mt-1 text-[9px] text-slate-400 sm:text-[10px]">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${actualPercent}%` }}
                title="Measured waste onboard"
              />
              <div
                className="h-full bg-blue-400 transition-all"
                style={{ width: `${Math.max(0, committedPercent - actualPercent)}%` }}
                title="Capacity reserved for assigned pickups"
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[9px] text-slate-400">
              <span>Green: onboard · Blue: reserved</span>
              <span>{Math.round(committedPercent)}% committed</span>
            </div>
            {nearlyFull && (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-[10px] font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                Vehicle capacity is nearly full. New assignments are paused until the collected load is delivered.
              </p>
            )}
          </div>
        )}
      </Panel>
      {resource.loading ? (
        <div className="h-64 animate-pulse rounded-xl bg-white dark:bg-slate-900" />
      ) : resource.error ? (
        <Panel>
          <p className="p-6 text-center text-xs text-rose-600">
            {resource.error}
          </p>
        </Panel>
      ) : jobs.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {jobs.map((job) => (
            <Panel key={job.id}>
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">
                      Route stop {job.routeStopOrder ?? "—"}
                    </p>
                    <h2 className="mt-1 text-sm font-semibold">{job.vendor}</h2>
                  </div>
                  <StatusBadge status={job.status ?? "Assigned"} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-[10px]">
                  <div>
                    <p className="text-slate-400">Waste</p>
                    <p className="mt-1 font-semibold">
                      {job.waste} · {job.fillLevel}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Priority</p>
                    <p className="mt-1 font-semibold">{job.priority}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Distance</p>
                    <p className="mt-1 font-semibold">
                      {job.distanceKm === undefined
                        ? "Calculating"
                        : `${job.distanceKm.toFixed(1)} km`}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">ETA</p>
                    <p className="mt-1 font-semibold">
                      {job.estimatedArrival
                        ? new Date(job.estimatedArrival).toLocaleTimeString(
                            "en-IN",
                            { hour: "numeric", minute: "2-digit" },
                          )
                        : "Calculating"}
                      {job.estimatedTravelMinutes !== undefined
                        ? ` · ${job.estimatedTravelMinutes} min`
                        : ""}
                    </p>
                  </div>
                </div>
                <p className="mt-4 flex gap-2 text-xs leading-5 text-slate-500">
                  <MapPin className="mt-0.5 size-3.5 shrink-0" />
                  {job.location}
                </p>
                {job.vendorPhone && (
                  <a
                    href={`tel:${job.vendorPhone}`}
                    className="mt-2 flex min-h-11 items-center gap-2 text-xs font-semibold text-emerald-600"
                  >
                    <Phone className="size-3.5" />
                    Call vendor
                  </a>
                )}
                {job.notes && (
                  <p className="mt-3 rounded-xl bg-slate-50 p-3 text-[10px] leading-4 text-slate-500 dark:bg-slate-950">
                    {job.notes}
                  </p>
                )}
                <PickupStatusTimeline status={job.status} />
                <Button
                  className="mt-4 w-full"
                  disabled={updating === job.id}
                  onClick={() => void advance(job)}
                >
                  {updating === job.id ? "Updating…" : actionLabel(job.status)}
                </Button>
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        <Panel>
          <EmptyState
            icon={<Check className="size-5" />}
            title="No assigned pickups"
            description="New Smart Assignment jobs will appear here automatically."
          />
        </Panel>
      )}
      {collecting && (
        <div
          className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="complete-pickup-title"
        >
          <form
            onSubmit={handleCollectionSubmit(recordCollection)}
            className="my-auto w-full max-w-lg rounded-2xl bg-white p-4 shadow-2xl dark:bg-slate-900 sm:p-6"
          >
            <div className="flex justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  {collecting.id}
                </p>
                <h2
                  id="complete-pickup-title"
                  className="mt-1 text-xl font-semibold"
                >
                  Record collected waste
                </h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setCollecting(null)}
                aria-label="Close collection form"
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="mt-5 grid gap-3">
              <Field
                label="Actual weight (kg)"
                error={collectionErrors.actualWeight?.message}
              >
                <input
                  {...registerCollection("actualWeight")}
                  type="number"
                  min="0.1"
                  step="0.1"
                  className={inputClass}
                />
              </Field>
            </div>
            <label className={`${labelClass} mt-4 block`}>
              Collection notes
              <textarea
                {...registerCollection("notes")}
                rows={3}
                className={`${inputClass} h-auto py-3`}
              />
            </label>
            <label className="mt-4 block cursor-pointer rounded-xl border border-dashed border-slate-300 p-3 text-center text-xs font-semibold text-slate-500 dark:border-slate-700">
              Upload collection photo (optional)
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  if (collectionPreview) URL.revokeObjectURL(collectionPreview);
                  setCollectionPhoto(file);
                  setCollectionPreview(file ? URL.createObjectURL(file) : "");
                }}
              />
            </label>
            {collectionPreview && (
              <Image
                src={collectionPreview}
                alt="Collection preview"
                width={640}
                height={360}
                unoptimized
                className="mt-3 aspect-video w-full rounded-xl object-cover"
              />
            )}
            <Button
              type="submit"
              disabled={isCollecting}
              className="mt-5 w-full"
            >
              <ClipboardCheck className="size-4" />
              {isCollecting ? "Recording…" : "Add load to vehicle"}
            </Button>
          </form>
        </div>
      )}
      {unloading && (
        <div
          className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="unload-vehicle-title"
        >
          <form
            onSubmit={handleUnloadSubmit(unloadVehicle)}
            className="my-auto w-full max-w-lg rounded-2xl bg-white p-4 shadow-2xl dark:bg-slate-900 sm:p-6"
          >
            <div className="flex justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  Facility delivery
                </p>
                <h2 id="unload-vehicle-title" className="mt-1 text-xl font-semibold">
                  Unload vehicle
                </h2>
                <p className="mt-1 text-[10px] leading-4 text-slate-400">
                  {Math.round(currentLoad)} kg measured waste currently onboard
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setUnloading(false)}
                aria-label="Close unload form"
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="mt-5">
              <Field
                label="Destination facility"
                error={unloadErrors.facility?.message}
              >
                <input {...registerUnload("facility")} className={inputClass} />
              </Field>
            </div>
            <label className={`${labelClass} mt-4 block`}>
              Delivery notes
              <textarea
                {...registerUnload("notes")}
                rows={3}
                className={`${inputClass} h-auto py-3`}
              />
            </label>
            <label className="mt-4 block cursor-pointer rounded-xl border border-dashed border-slate-300 p-3 text-center text-xs font-semibold text-slate-500 dark:border-slate-700">
              Upload unload proof (optional)
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  if (unloadPreview) URL.revokeObjectURL(unloadPreview);
                  setUnloadPhoto(file);
                  setUnloadPreview(file ? URL.createObjectURL(file) : "");
                }}
              />
            </label>
            {unloadPreview && (
              <Image
                src={unloadPreview}
                alt="Unload proof preview"
                width={640}
                height={360}
                unoptimized
                className="mt-3 aspect-video w-full rounded-xl object-cover"
              />
            )}
            <Button
              type="submit"
              disabled={isUnloading || currentLoad <= 0}
              className="mt-5 w-full"
            >
              <Warehouse className="size-4" />
              {isUnloading ? "Recording delivery…" : "Confirm facility unload"}
            </Button>
          </form>
        </div>
      )}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}

function actionLabel(status: PickupJob["status"]) {
  if (status === "Assigned") return "Accept assignment";
  if (status === "Accepted") return "Start journey";
  if (status === "In transit") return "Mark arrived";
  if (status === "Arrived") return "Record collected weight";
  if (status === "Collected") return "Unload at facility";
  return "Update pickup";
}

function DriverRoutePage() {
  const resource = useAsyncResource(
    () => driverService.getAssignedJobs("driver"),
    "driver-route",
  );
  usePickupRealtime(resource.reload);
  const jobs = useMemo(
    () =>
      [...(resource.data ?? [])].sort(
        (a, b) => (a.routeStopOrder ?? 99) - (b.routeStopOrder ?? 99),
      ),
    [resource.data],
  );
  const nextJob = jobs[0];
  return (
    <div className="space-y-4 sm:space-y-7">
      <PageHeader
        eyebrow="Route overview"
        title="Current route"
        description="Live driver position and the current collection order."
      />
      <LivePickupTracking
        driverId={nextJob?.assignedDriverId}
        status={nextJob?.status}
        destinationLatitude={nextJob?.vendorLatitude}
        destinationLongitude={nextJob?.vendorLongitude}
      />
      <Panel
        title="Collection order"
        subtitle="Priority and market batching determine the initial order"
      >
        {resource.loading ? (
          <div className="h-40 animate-pulse" />
        ) : jobs.length ? (
          <div className="divide-y divide-slate-100 p-2 dark:divide-slate-800">
            {jobs.map((job) => (
              <div key={job.id} className="flex gap-3 p-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10">
                  {job.routeStopOrder ?? "•"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{job.vendor}</p>
                  <p className="mt-1 truncate text-[10px] text-slate-400">
                    {job.location}
                    {job.distanceKm !== undefined
                      ? ` · ${job.distanceKm.toFixed(1)} km`
                      : ""}
                    {job.estimatedTravelMinutes !== undefined
                      ? ` · ${job.estimatedTravelMinutes} min`
                      : ""}
                  </p>
                </div>
                <StatusBadge status={job.status ?? "Assigned"} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Navigation className="size-5" />}
            title="No route assigned"
            description="Your next route will appear after Smart Assignment."
          />
        )}
      </Panel>
    </div>
  );
}

function DriverHistoryPage() {
  const resource = useAsyncResource(
    () => driverService.getCompletedJobs(),
    "driver-history",
  );
  return (
    <div className="space-y-4 sm:space-y-7">
      <PageHeader
        eyebrow="Driver activity"
        title="Completed jobs"
        description="Your completed pickups, measured weights, facilities, and proof photos."
      />
      <Panel>
        {resource.loading ? (
          <div className="h-56 animate-pulse bg-slate-50 dark:bg-slate-950" />
        ) : resource.error ? (
          <p className="p-6 text-center text-xs text-rose-600">
            {resource.error}
          </p>
        ) : resource.data?.length ? (
          <div className="grid gap-2.5 p-3 sm:p-5">
            {resource.data.map((job) => (
              <article
                key={job.id}
                className="rounded-xl border border-slate-100 p-3.5 dark:border-slate-800"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold">{job.id}</p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {job.vendor} · {job.waste}
                    </p>
                  </div>
                  <StatusBadge status="Completed" />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-[10px]">
                  <div>
                    <p className="text-slate-400">Actual weight</p>
                    <p className="mt-1 font-semibold">
                      {job.actualWeight ?? 0} kg
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Facility</p>
                    <p className="mt-1 font-semibold">
                      {job.facility ?? "Recorded facility"}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Recycle className="size-5" />}
            title="No completed jobs"
            description="Completed pickups will appear here."
          />
        )}
      </Panel>
    </div>
  );
}
