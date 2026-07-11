import { cn } from "@/lib/utils/cn";
// Fixed, prominent PFC + kcal display (spec §10).
export function NutritionBadge({ kcal, p, f, c, estimated, className }:
  { kcal?: number | null; p?: number | null; f?: number | null; c?: number | null; estimated?: boolean; className?: string }) {
  const cell = (label: string, v?: number | null, unit = "g") => (
    <div className="flex flex-col items-center">
      <span className="text-[10px] text-ink/60">{label}</span>
      <span className="text-sm font-bold">{v == null ? "—" : `${Math.round(v)}${unit}`}</span>
    </div>
  );
  return (
    <div className={cn("rounded-xl bg-sage/40 px-3 py-2", className)}>
      <div className="grid grid-cols-4 gap-1">
        {cell("kcal", kcal, "")}{cell("P", p)}{cell("F", f)}{cell("C", c)}
      </div>
      {estimated && <p className="mt-1 text-[9px] leading-tight text-ink/60">※材料と分量をもとにしたAI推定値です</p>}
    </div>
  );
}
