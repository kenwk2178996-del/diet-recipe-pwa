"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { NutritionBadge } from "@/components/ui/nutrition-badge";
import type { AiRecipe } from "@/lib/types";
import { ChevronUp, ChevronDown, Trash2, Plus } from "lucide-react";

interface Props {
  initial: AiRecipe;
  warnings?: string[];
  source?: { url?: string | null; site?: string | null; sns?: string | null; author?: string | null };
  mainImageUrl?: string | null;
  allTags?: { id: string; name: string; category: string | null }[];
  recipeId?: string; // when editing existing
}

export function RecipeForm({ initial, warnings = [], source, mainImageUrl, allTags = [], recipeId }: Props) {
  const [r, setR] = useState<AiRecipe>(initial);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const estimated = r.nutrition?.source === "ai_estimated";

  const upd = (patch: Partial<AiRecipe>) => setR((p) => ({ ...p, ...patch }));
  const setIng = (i: number, patch: any) => setR((p) => ({ ...p, ingredients: p.ingredients.map((x, idx) => idx === i ? { ...x, ...patch } : x) }));
  const setStep = (i: number, patch: any) => setR((p) => ({ ...p, steps: p.steps.map((x, idx) => idx === i ? { ...x, ...patch } : x) }));
  const moveStep = (i: number, dir: -1 | 1) => setR((p) => {
    const s = [...p.steps]; const j = i + dir; if (j < 0 || j >= s.length) return p;
    [s[i], s[j]] = [s[j], s[i]]; return { ...p, steps: s.map((x, idx) => ({ ...x, step_no: idx + 1 })) };
  });

  async function save(status: "draft" | "published") {
    setBusy(true); setErr(null);
    try {
      const suggestedIds = allTags.filter((t) => r.suggested_tags?.includes(t.name)).map((t) => t.id);
      const body = { recipe: r, status, source, mainImageUrl, tagIds: [...new Set([...tagIds, ...suggestedIds])], nutritionSource: r.nutrition?.source };
      const url = recipeId ? `/api/recipes/${recipeId}` : "/api/recipes";
      const res = await fetch(url, { method: recipeId ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "保存に失敗しました");
      window.location.href = recipeId ? `/recipes/${recipeId}` : `/recipes/${j.id}`;
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      {warnings.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <ul className="list-disc pl-4">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </Card>
      )}
      <Input value={r.title} onChange={(e) => upd({ title: e.target.value })} placeholder="レシピ名" className="text-base font-semibold" />
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-ink/60">調理時間(分)
          <Input type="number" value={r.cook_time_min ?? ""} onChange={(e) => upd({ cook_time_min: e.target.value ? +e.target.value : null })} />
        </label>
        <label className="text-xs text-ink/60">人数(人分)
          <Input type="number" value={r.servings ?? ""} onChange={(e) => upd({ servings: e.target.value ? +e.target.value : null })} />
        </label>
      </div>

      <NutritionBadge kcal={r.nutrition?.kcal} p={r.nutrition?.protein_g} f={r.nutrition?.fat_g} c={r.nutrition?.carb_g} estimated={estimated} />

      <section>
        <h3 className="mb-1 text-sm font-semibold">材料</h3>
        <div className="space-y-2">
          {r.ingredients.map((ing, i) => (
            <div key={i} className="flex gap-2">
              <Input value={ing.name} onChange={(e) => setIng(i, { name: e.target.value })} placeholder="材料名" className="flex-[2]" />
              <Input value={ing.amount ?? ""} onChange={(e) => setIng(i, { amount: e.target.value ? +e.target.value : null })} placeholder="量" className="flex-1" />
              <Input value={ing.unit ?? ""} onChange={(e) => setIng(i, { unit: e.target.value })} placeholder="単位" className="w-16" />
              <button onClick={() => setR((p) => ({ ...p, ingredients: p.ingredients.filter((_, x) => x !== i) }))} className="text-ink/40"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
        <Button variant="ghost" className="mt-1 text-xs" onClick={() => setR((p) => ({ ...p, ingredients: [...p.ingredients, { name: "", amount: null, unit: null, note: null, group: null }] }))}><Plus size={14} />材料を追加</Button>
      </section>

      <section>
        <h3 className="mb-1 text-sm font-semibold">作り方</h3>
        <div className="space-y-2">
          {r.steps.map((s, i) => (
            <div key={i} className="flex gap-2">
              <div className="flex flex-col items-center gap-0.5 pt-1">
                <button onClick={() => moveStep(i, -1)} className="text-ink/40"><ChevronUp size={14} /></button>
                <span className="text-xs font-bold text-sage-dark">{i + 1}</span>
                <button onClick={() => moveStep(i, 1)} className="text-ink/40"><ChevronDown size={14} /></button>
              </div>
              <textarea value={s.content} onChange={(e) => setStep(i, { content: e.target.value })} rows={2} className="flex-1 rounded-xl border border-beige bg-ivory px-3 py-2 text-sm" />
              <button onClick={() => setR((p) => ({ ...p, steps: p.steps.filter((_, x) => x !== i).map((x, idx) => ({ ...x, step_no: idx + 1 })) }))} className="text-ink/40"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
        <Button variant="ghost" className="mt-1 text-xs" onClick={() => setR((p) => ({ ...p, steps: [...p.steps, { step_no: p.steps.length + 1, content: "", heat_time_min: null, temperature: null }] }))}><Plus size={14} />手順を追加</Button>
      </section>

      {allTags.length > 0 && (
        <section>
          <h3 className="mb-1 text-sm font-semibold">タグ</h3>
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((t) => {
              const on = tagIds.includes(t.id) || r.suggested_tags?.includes(t.name);
              return <button key={t.id} onClick={() => setTagIds((p) => p.includes(t.id) ? p.filter((x) => x !== t.id) : [...p, t.id])}
                className={`rounded-full px-2.5 py-1 text-xs ${on ? "bg-sage-dark text-white" : "bg-mist text-ink/70"}`}>{t.name}</button>;
            })}
          </div>
        </section>
      )}

      {err && <p className="text-xs text-red-600">{err}</p>}
      <div className="sticky bottom-16 flex gap-2 bg-cream/90 py-2">
        <Button variant="outline" className="flex-1" disabled={busy} onClick={() => save("draft")}>下書き保存</Button>
        <Button className="flex-[2]" disabled={busy} onClick={() => save("published")}>{busy ? "保存中…" : "保存する"}</Button>
      </div>
    </div>
  );
}
