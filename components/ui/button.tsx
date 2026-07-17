import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px",
  {
    variants: {
      variant: {
        default: "bg-emerald-600 text-white shadow-[0_8px_24px_rgba(22,163,74,.22)] hover:bg-emerald-700 hover:shadow-[0_10px_28px_rgba(22,163,74,.3)]",
        dark: "bg-slate-950 text-white shadow-lg hover:bg-slate-800",
        outline: "border border-slate-200 bg-white text-slate-800 shadow-sm hover:border-slate-300 hover:bg-slate-50",
        ghost: "text-slate-700 hover:bg-slate-100",
      },
      size: { default: "h-11 px-5", sm: "h-9 px-4 text-xs", lg: "h-13 px-7 text-base", icon: "size-11" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean; }

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
