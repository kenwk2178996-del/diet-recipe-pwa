"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { MEAL_TYPES } from "@/lib/nutrition";
import { Input } from "@/components/ui/input";
import { RecipeImageFallback } from "@/components/recipe/recipe-image-fallback";

function iso(d: Date) { return d.toISOString().slice(0, 10); }
function startOfWeek(base: Date) { const d = new Date(base); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); d.setHours(0,0,0,0); return d; }
function jstNow() { return new Date(Date.now() + 9 * 3600 * 1000); }

export function CalendarClient({ recipes }: { recipes: any[] }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(jstNow()));
  const [plans, setPlans] = useState<any[]>([]);
  const [picker, setPicker] = useState<{ date: string; meal: string } | null>(null);
  const [q, setQ] = useState("");
  const todayIso = iso(jstNow());

  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; });
  const from = iso(days[0]); const to = iso(days[6]);

  const load = useCallback(async () => {
    const r = await fetch(`/api/meal-plans?from=${from}&to=${to}`).then((r) => r.json());
    setPlans(r.plans ?? []);
  }, [from, to]);
  useEffect(() => { load(); }, [load]);

  async function add(recipeId: string) {
    if (!picker) return;
    await fetch("/api/meal-plans", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ date: picker.date, meal_type: picker.meal, recipe_id: recipeId }) });
    setPicker(null); setQ(""); load();
  }
  async function remove(id: string) {
    await fetch(`/api/meal-plans?id=${id}`, { method: "DELETE" }); load();
  }

  const forSlot = (date: string, meal: string) => plans.filter((p) => p.date === date && p.meal_type === meal);
  const filtered = q ? recipes.filter((r) => r.title.toLowerCase().includes(q.toLowerCase())) : recipes;

  return (
    <div className="space-y-3 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">献立カレンダー</h1>
        <div className="flex items-center gap-1 text-sm">
          <button onClick={() => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; })} className="rounded-lg border border-beige bg-white p-1.5"><ChevronLeft size={16} /></button>
          <button onClick={() => setWeekStart(startOfWeek(jstNow()))} className="rounded-lg border border-beige bg-white px-2 py-1 text-xs">今週</button>
          <button onClick={() => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; })} className="rounded-lg border border-beige bg-white p-1.5"><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="space-y-2">
        {days.map((d) => {
          const di = iso(d);
          const isToday = di === todayIso;
          return (
            <div key={di} className={`rounded-2xl border bg-white p-3 ${isToday ? "border-sage-dark" : "border-beige"}`}>
              <p className={`mb-2 text-sm font-semibold ${isToday ? "text-sage-dark" : ""}`}>
                {d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" })}{isToday ? " ・今日" : ""}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {MEAL_TYPES.map((meal) => (
                  <div key={meal}>
                    <p className="mb-1 text-[10px] text-ink/50">{meal}</p>
                    <div className="space-y-1">
                      {forSlot(di, meal).map((p) => (
                        <div key={p.id} className="flex items-center gap-1 rounded-lg bg-mist px-1.5 py-1 text-[10px]">
                          <span className="min-w-0 flex-1 truncate">{p.recipes?.title ?? "?"}</span>
                          <button onClick={() => remove(p.id)} className="text-ink/40"><X size={11} /></button>
                        </div>
                      ))}
                      <button onClick={() => setPicker({ date: di, meal })} className="flex w-full items-center justify-center rounded-lg border border-dashed border-beige py-1 text-ink/40"><Plus size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {picker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center" onClick={() => setPicker(null)}>
          <div className="max-h-[75vh] w-full max-w-md overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-beige p-3">
              <p className="text-sm font-semibold">{picker.meal}に追加</p>
              <button onClick={() => setPicker(null)}><X size={18} /></button>
            </div>
            <div className="p-3"><Input placeholder="レシピを検索" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <div className="max-h-[55vh] overflow-y-auto px-3 pb-4">
              {filtered.length === 0 && <p className="py-6 text-center text-xs text-ink/50">レシピがありません。先に保存してください。</p>}
              {filtered.map((r) => (
                <button key={r.id} onClick={() => add(r.id)} className="flex w-full items-center gap-2 border-b border-beige py-2 text-left">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-beige">
                    {r.main_image_url
                      ? <img src={r.main_image_url} alt="" className="h-full w-full object-cover" />
                      : <RecipeImageFallback title={r.title} compact />}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm">{r.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
