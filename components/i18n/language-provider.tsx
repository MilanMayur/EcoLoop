"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  DEFAULT_LOCALE,
  LANGUAGE_COOKIE,
  LANGUAGE_STORAGE_KEY,
  normalizeLocale,
  supportedLocales,
  translate,
  type Locale,
} from "@/lib/i18n";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (source: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const ignoredTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE"]);
const translatedAttributes = ["aria-label", "alt", "placeholder", "title"] as const;

export function LanguageProvider({ children, initialLocale = DEFAULT_LOCALE, hasStoredPreference = false }: { children: ReactNode; initialLocale?: Locale; hasStoredPreference?: boolean }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const textSources = useRef(new WeakMap<Text, string>());
  const attributeSources = useRef(new WeakMap<Element, Map<string, string>>());

  const setLocale = useCallback((nextLocale: Locale) => {
    if (nextLocale === locale) return;
    setLocaleState(nextLocale);
    document.documentElement.lang = nextLocale;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLocale);
    document.cookie = `${LANGUAGE_COOKIE}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
  }, [locale]);

  const t = useCallback((source: string) => translate(locale, source), [locale]);

  useEffect(() => {
    if (hasStoredPreference) {
      document.documentElement.lang = locale;
      return;
    }
    const detected = normalizeLocale(localStorage.getItem(LANGUAGE_STORAGE_KEY) || navigator.language);
    const timer = window.setTimeout(() => {
      if (detected !== locale) setLocale(detected);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [hasStoredPreference, locale, setLocale]);

  useEffect(() => {
    const translateElement = (element: Element) => {
      let sources = attributeSources.current.get(element);
      if (!sources) {
        sources = new Map<string, string>();
        attributeSources.current.set(element, sources);
      }
      for (const attribute of translatedAttributes) {
        const current = element.getAttribute(attribute);
        if (!current) continue;
        if (!sources.has(attribute)) sources.set(attribute, current);
        const storedSource = sources.get(attribute) ?? current;
        const isKnownRendering = supportedLocales.some((candidateLocale) => translate(candidateLocale, storedSource) === current);
        const source = isKnownRendering ? storedSource : current;
        if (!isKnownRendering) sources.set(attribute, current);
        const localized = translate(locale, source);
        if (current !== localized) element.setAttribute(attribute, localized);
      }
    };

    const translateTree = (root: Node) => {
      if (root instanceof Element && ignoredTags.has(root.tagName)) return;
      if (root instanceof Text) {
        const parent = root.parentElement;
        if (!parent || ignoredTags.has(parent.tagName)) return;
        const current = root.nodeValue ?? "";
        const storedSource = textSources.current.get(root);
        let source = storedSource ?? current;
        if (storedSource !== undefined) {
          const storedTrimmed = storedSource.trim();
          const isKnownRendering = supportedLocales.some((candidateLocale) => {
            const translated = storedTrimmed ? storedSource.replace(storedTrimmed, translate(candidateLocale, storedTrimmed)) : storedSource;
            return current === translated;
          });
          if (!isKnownRendering) {
            source = current;
            textSources.current.set(root, current);
          }
        } else {
          textSources.current.set(root, current);
        }
        const trimmed = source.trim();
        if (!trimmed) return;
        const localized = translate(locale, trimmed);
        const next = source.replace(trimmed, localized);
        if (current !== next) root.nodeValue = next;
        return;
      }
      if (root instanceof Element) translateElement(root);
      root.childNodes.forEach(translateTree);
    };

    translateTree(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") translateTree(mutation.target);
        mutation.addedNodes.forEach(translateTree);
      }
    });
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
