"use client";
import * as React from "react";
import { cn } from "@/lib/utils/cn";
type Variant = "primary" | "ghost" | "outline" | "danger";
export function Button({ className, variant = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const styles: Record<Variant, string> = {
    primary: "bg-sage-dark text-white hover:opacity-90",
    ghost: "bg-transparent text-ink hover:bg-mist",
    outline: "border border-beige bg-white text-ink hover:bg-mist",
    danger: "bg-red-500 text-white hover:opacity-90",
  };
  return <button className={cn("inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:opacity-50", styles[variant], className)} {...props} />;
}
