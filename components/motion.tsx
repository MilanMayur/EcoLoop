"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return <motion.div className={className} initial={reduce ? false : { opacity: 0, y: 24 }} whileInView={reduce ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>;
}

export function Float({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return <motion.div className={className} animate={reduce ? undefined : { y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>{children}</motion.div>;
}

export function CountUp({ value, suffix = "", decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (reduce) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / 1400, 1);
      setShown(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce, value]);
  const displayValue = reduce ? value : shown;
  return <span ref={ref}>{displayValue.toFixed(decimals)}{suffix}</span>;
}

export function PulseDot({ className }: { className?: string }) {
  return <span className={cn("relative flex size-2.5", className)} aria-hidden="true"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-50 motion-reduce:animate-none" /><span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" /></span>;
}
