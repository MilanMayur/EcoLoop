"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type CancellationRole = "vendor" | "recycler" | "admin";
type DialogProps = {
  open: boolean;
  role: CancellationRole;
  referenceCode: string;
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void> | void;
};

const reasonOptions: Record<Exclude<CancellationRole, "vendor">, string[]> = {
  recycler: [
    "No available vehicle",
    "Driver unavailable",
    "Vehicle breakdown",
    "Service area restriction",
    "Other operational issue",
  ],
  admin: [
    "Duplicate request",
    "Fraudulent request",
    "Legal or safety concern",
    "Market closure",
    "Disaster or emergency",
    "Administrative correction",
  ],
};

export function PickupCancellationDialog(props: DialogProps) {
  if (!props.open) return null;
  return <PickupCancellationDialogContent key={props.referenceCode} {...props} />;
}

function PickupCancellationDialogContent({
  role,
  referenceCode,
  loading,
  error,
  onClose,
  onConfirm,
}: DialogProps) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const closeDialog = useEffectEvent(onClose);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) closeDialog();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [loading]);

  const requiresReason = role !== "vendor";
  const composedReason = requiresReason
    ? [reason, details.trim()].filter(Boolean).join(" — ")
    : undefined;
  const canSubmit = !loading && (!requiresReason || Boolean(reason));

  return (
    <div
      className="fixed inset-0 z-[110] grid place-items-end bg-slate-950/50 p-0 backdrop-blur-sm sm:place-items-center sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="pickup-cancellation-title"
        aria-describedby="pickup-cancellation-description"
        className="w-full rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:max-w-lg sm:rounded-3xl sm:p-6"
      >
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10">
            <AlertTriangle className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="pickup-cancellation-title" className="text-base font-semibold tracking-[-.025em]">
              Cancel pickup {referenceCode}
            </h2>
            <p id="pickup-cancellation-description" className="mt-1 text-xs leading-5 text-slate-500">
              {role === "vendor"
                ? "This is allowed only while the request is pending and no driver has been assigned."
                : role === "recycler"
                  ? "Use cancellation only for a genuine operational issue. The vendor and BBMP will be notified."
                  : "BBMP cancellation is reserved for exceptional governance, legal, safety, or administrative situations."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close cancellation dialog"
            className="grid size-10 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800"
          >
            <X className="size-4" />
          </button>
        </div>

        {requiresReason && (
          <div className="mt-5 space-y-4">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Cancellation reason *
              <select
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base text-slate-800 outline-none transition focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:text-sm"
                autoFocus
              >
                <option value="">Select a reason</option>
                {reasonOptions[role].map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Additional details
              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                maxLength={350}
                rows={3}
                placeholder="Add useful operational or governance context…"
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:text-sm"
              />
            </label>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-3.5 py-3 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Keep request
          </Button>
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={() => void onConfirm(composedReason)}
            className="bg-rose-600 text-white shadow-[0_8px_24px_rgba(225,29,72,.2)] hover:bg-rose-700"
          >
            {loading ? "Cancelling…" : "Confirm cancellation"}
          </Button>
        </div>
      </section>
    </div>
  );
}
