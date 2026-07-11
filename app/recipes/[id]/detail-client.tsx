"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Star, Trash2, Pencil, Copy, ChefHat } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NutritionBadge } from "@/components/ui/nutrition-badge";
import { scaleAmount } from "@/lib/utils/scale";

export function DetailClient({ recipe }: { recipe: any }) {
  const router = useRouter();
  const nut = Array.isArray(recipe.nutrition) ? recipe.nutrition[0] : recipe.nutrition;
  const [fav, setFav] = useState(recipe.is_favorite);
  const [rating, setRating] = useState(recipe.rating ?? 0);
  const [memo, setMemo] = useState(recipe.memo ?? "");
  const [cooked, setCooked] = useState(recipe.cooked_count ?? 0);
  const [servings, setServings] = useState(recipe.servings || 1);
  const base = recipe.servings || 1;

  async function patch(body: any) {
    await fetch(`/api/recipes/${recipe.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  }
  async function remove() {
    if (!confirm("このレシピを削除しますか？")) return;
    await fetch(`/api/recipes/${recipe.id}`, { method: "DELETE" });
    router.push("/");
  }
  async function duplicate() {
    const body = {
      recipe: {
        title: recipe.title + "（コピー）", description: recipe.description, cook_time_min: recipe.cook_time_min, servings: recipe.servings,
        ingredients: recipe.ingredients.map((i: any) => ({ name: i.name, amount: i.amount, unit: i.unit, note: i.note, group: i.group_name })),
        steps: recipe.steps.map((s: any) => ({ step_no: s.step_no, content: s.content, heat_time_min: s.heat_time_min, temperature: s.temperature })),
        nutrition: { kcal: nut?.kcal ?? null, protein_g: nut?.protein_g ?? null, fat_g: nut?.fat_g ?? null, carb_g: nut?.carb_g ?? null, source: nut?.source ?? "ai_estimated" },
        suggested_tags: [],
      }, status: "draft",
    };
    const j = await fetch("/api/recipes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
    if (j.id) router.push(`/recipes/${j.id}/edit`);
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="relative -mx-4 aspect-[16/10] bg-beige">
        {recipe.main_image_url && <img src={recipe.main_image_url} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-xl font-bold">{recipe.title}</h1>
        <button onClick={() => { setFav(!fav); patch({ is_favorite: !fav }); }}>
          <Heart className={fav ? "fill-red-400 text-red-400" : "text-ink/40"} />
        </button>
      </div>
      {recipe.source_url && <a href={recipe.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-sage-dark underline">元の投稿を見る{recipe.source_author ? ` (@${recipe.source_author})` : ""}</a>}

      <NutritionBadge kcal={nut?.kcal} p={nut?.protein_g} f={nut?.fat_g} c={nut?.carb_g} estimated={nut?.source === "ai_estimated"} />

      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => { setRating(n); patch({ rating: n }); }}>
            <Star size={22} className={n <= rating ? "fill-amber-400 text-amber-400" : "text-ink/30"} />
          </button>
        ))}
      </div>

      <Card className="p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">材料</span>
          <span className="flex items-center gap-2 text-xs text-ink/60">
            <button onClick={() => setServings((s: number) => Math.max(1, s - 1))} className="rounded bg-mist px-2 py-0.5">−</button>
            {servings}人分
            <button onClick={() => setServings((s: number) => s + 1)} className="rounded bg-mist px-2 py-0.5">＋</button>
          </span>
        </div>
        <ul className="mt-2 divide-y divide-beige text-sm">
          {recipe.ingredients.map((i: any) => (
            <li key={i.id} className="flex justify-between py-1.5">
              <span>{i.name}{i.note ? <span className="text-ink/50">（{i.note}）</span> : ""}</span>
              <span className="text-ink/70">{scaleAmount(i.amount, base, servings) ?? ""}{i.unit ?? ""}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-3">
        <span className="text-sm font-semibold">作り方</span>
        <ol className="mt-2 space-y-2 text-sm">
          {recipe.steps.map((s: any) => (
            <li key={s.id} className="flex gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sage-dark text-[11px] text-white">{s.step_no}</span>
              <span>{s.content}</span>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="p-3">
        <span className="text-sm font-semibold">メモ</span>
        <textarea value={memo} onChange={(e) => setMemo(e.target.value)} onBlur={() => patch({ memo })} rows={2} className="mt-1 w-full rounded-xl border border-beige bg-ivory px-3 py-2 text-sm" placeholder="味の感想や調整メモ" />
        <button onClick={() => { const c = cooked + 1; setCooked(c); patch({ markCooked: true, cooked_count: cooked }); }} className="mt-2 flex items-center gap-1.5 text-xs text-sage-dark">
          <ChefHat size={15} /> 作った！（{cooked}回）
        </button>
      </Card>

      <div className="flex gap-2">
        <Link href={`/recipes/${recipe.id}/edit`} className="flex-1"><Button variant="outline" className="w-full"><Pencil size={15} />編集</Button></Link>
        <Button variant="outline" onClick={duplicate}><Copy size={15} />複製</Button>
        <Button variant="danger" onClick={remove}><Trash2 size={15} /></Button>
      </div>
    </div>
  );
}
