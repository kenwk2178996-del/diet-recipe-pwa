import { cn } from "@/lib/utils/cn";
export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-beige bg-white shadow-sm", className)} {...p} />;
}
