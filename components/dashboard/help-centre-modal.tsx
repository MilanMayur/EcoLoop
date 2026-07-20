"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, HelpCircle, Send, X } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/i18n/language-provider";
import { supportService } from "@/services/support.service";

const schema = z.object({
  subject: z
    .string()
    .trim()
    .min(3, "Enter a subject with at least 3 characters.")
    .max(120, "Keep the subject under 120 characters."),
  issue: z
    .string()
    .trim()
    .min(10, "Describe the issue using at least 10 characters.")
    .max(2000, "Keep the issue under 2,000 characters."),
});

type FormValues = z.infer<typeof schema>;

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

export function HelpCentreModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const subjectRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { subject: "", issue: "" },
  });
  const subjectRegistration = register("subject");

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => subjectRef.current?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        reset();
        setError("");
        setRequestId("");
        onClose();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, open, reset]);

  const close = () => {
    reset();
    setError("");
    setRequestId("");
    onClose();
  };

  const submit = async (values: FormValues) => {
    setError("");
    try {
      const id = await supportService.createRequest(values);
      setRequestId(id);
      reset();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Your support request could not be submitted.",
      );
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] grid items-end p-0 sm:place-items-center sm:p-5">
      <button
        type="button"
        aria-label={t("Close Help Centre")}
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        onClick={close}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-centre-title"
        className="relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:max-w-lg sm:rounded-3xl"
      >
        <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800 sm:px-6 sm:py-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10">
            <HelpCircle className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="help-centre-title" className="text-base font-semibold">
              {t("EcoLoop Help Centre")}
            </h2>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">
              {t("Tell BBMP support what you need help with.")}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={close}
            aria-label={t("Close Help Centre")}
          >
            <X className="size-4" />
          </Button>
        </div>

        {requestId ? (
          <div className="px-5 py-8 text-center sm:px-8 sm:py-10">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              <Check className="size-5" />
            </span>
            <h3 className="mt-4 text-sm font-semibold">
              {t("Support request submitted")}
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-slate-500">
              {t("BBMP support can now review your issue and account details.")}
            </p>
            <p className="mt-3 text-[9px] font-medium text-slate-400">
              {t("Reference")} · {requestId.slice(0, 8).toUpperCase()}
            </p>
            <Button type="button" className="mt-6 w-full sm:w-auto" onClick={close}>
              {t("Done")}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(submit)} className="space-y-4 p-4 sm:p-6" noValidate>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("Subject")} *
              <input
                {...subjectRegistration}
                ref={(element) => {
                  subjectRegistration.ref(element);
                  subjectRef.current = element;
                }}
                maxLength={120}
                className={`${inputClass} h-11`}
              />
              {errors.subject && (
                <span className="mt-1.5 block text-[10px] text-rose-600">
                  {t(errors.subject.message ?? "")}
                </span>
              )}
            </label>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("Issue")} *
              <textarea
                {...register("issue")}
                rows={6}
                maxLength={2000}
                className={`${inputClass} resize-y py-3`}
              />
              {errors.issue && (
                <span className="mt-1.5 block text-[10px] text-rose-600">
                  {t(errors.issue.message ?? "")}
                </span>
              )}
            </label>
            <p className="text-[10px] leading-4 text-slate-400">
              {t("Your account name, role, contact details, and workspace will be included automatically.")}
            </p>
            {error && (
              <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-3 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                {error}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={close}>
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <Send className="size-4" />
                {isSubmitting ? t("Submitting…") : t("Submit request")}
              </Button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
