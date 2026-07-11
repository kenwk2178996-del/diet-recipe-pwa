import { cn } from "@/lib/utils/cn";

function Bar({ label, value, goal, unit, color }: { label: string; value: number; goal: number | null; unit: string; color: string }) {
  const pct = goal && goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-ink/60">{label}</span>
        <span className="font-semibold">{value}{goal ? <span className="text-ink/40"> / {goal}</span> : ""}{unit}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-mist">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${goal ? pct : 0}%` }} />
      </div>
    </div>
  );
}

export function NutritionGoal({ totals, goals }: {
  totals: { kcal: number; protein_g: number; fat_g: number; carb_g: number };
  goals: { goal_kcal: number | null; goal_protein_g: number | null; goal_fat_g: number | null; goal_carb_g: number | null };
}) {
  const hasGoal = goals.goal_kcal || goals.goal_protein_g;
  return (
    <div className="space-y-2.5">
      <Bar label="カロリー" value={totals.kcal} goal={goals.goal_kcal} unit="kcal" color="bg-sage-dark" />
      <Bar label="タンパク質" value={totals.protein_g} goal={goals.goal_protein_g} unit="g" color="bg-rose-400" />
      <div className="grid grid-cols-2 gap-3">
        <Bar label="脂質" value={totals.fat_g} goal={goals.goal_fat_g} unit="g" color="bg-amber-400" />
        <Bar label="炭水化物" value={totals.carb_g} goal={goals.goal_carb_g} unit="g" color="bg-sky-400" />
      </div>
      {!hasGoal && <p className="text-[11px] text-ink/50">目標値は「設定」で登録すると達成度バーが表示されます。</p>}
    </div>
  );
}
