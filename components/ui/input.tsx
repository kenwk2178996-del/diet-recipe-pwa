import * as React from "react";
import { cn } from "@/lib/utils/cn";
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => <input ref={ref} className={cn("w-full rounded-xl border border-beige bg-ivory px-3 py-2.5 text-sm outline-none focus:border-sage-dark", className)} {...p} />
);
Input.displayName = "Input";
