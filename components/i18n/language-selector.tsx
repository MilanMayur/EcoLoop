"use client";

import { Languages } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/components/i18n/language-provider";
import { localeLabels, supportedLocales, type Locale } from "@/lib/i18n";
import { authService } from "@/services/auth.service";
import { cn } from "@/lib/utils";

export function LanguageSelector({ persistToProfile = false, className }: { persistToProfile?: boolean; className?: string }) {
  const { locale, setLocale, t } = useLanguage();
  const [saving, setSaving] = useState(false);

  const changeLanguage = async (next: Locale) => {
    setLocale(next);
    if (!persistToProfile) return;
    setSaving(true);
    try {
      await authService.updatePreferredLanguage(next);
    } catch {
      // The browser preference still works if a profile update is temporarily unavailable.
    } finally {
      setSaving(false);
    }
  };

  return (
    <label className={cn("inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300", className)}>
      <Languages className="size-4 text-emerald-600" aria-hidden="true" />
      <span className="sr-only">{t("Language")}</span>
      <select
        aria-label={t("Language")}
        value={locale}
        disabled={saving}
        onChange={(event) => void changeLanguage(event.target.value as Locale)}
        className="cursor-pointer bg-transparent text-xs font-semibold outline-none disabled:cursor-wait"
      >
        {supportedLocales.map((item) => <option key={item} value={item}>{localeLabels[item]}</option>)}
      </select>
    </label>
  );
}
