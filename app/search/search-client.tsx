"use client";
import { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { effectiveTagNames } from "@/lib/autotag";
import { Grid, List, SlidersHorizontal } from "lucide-react";

export function SearchClient({ allTags }: { allTags: any[] }) {
  const [q, setQ] = useState("");
  const [favorite, setFavorite] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [maxKcal, setMaxKcal] = useState<string>("");
  const [minProtein, setMinProtein] = useState<string>("");
  const [maxTime, setMaxTime] = useState<string>("");
  const [selTags, setSelTags] = useState<string[]>([]);
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const run = useCallback(async () => {
    // キーワードは材料・カテゴリも対象にするため、サーバでは絞らず取得してクライアントで判定。
    const p = new URLSearchParams();
    p.set("size", "50");
    if (favorite) p.set("favorite", "1");
    if (minRating) p.set("minRating", String(minRating));
    if (maxTime) p.set("maxTime", maxTime);
    const res = await fetch(`/api/recipes?${p.toString()}`).then((r) => r.json());
    const term = q.trim().toLowerCase();

    const list = (res.recipes ?? []).filter((r: any) => {
      const n = Array.isArray(r.nutrition) ? r.nutrition[0] : r.nutrition;
      if (maxKcal && (n?.kcal == null || n.kcal > +maxKcal)) return false;
      if (minProtein && (n?.protein_g == null || n.protein_g < +minProtein)) return false;

      const effective = effectiveTagNames(r); // 付与済み ∪ 材料/時間/栄養からの自動判定

      // タグ絞り込み: 選択タグをすべて満たす(材料由来のカテゴリも一致扱い)
      if (selTags.length && !selTags.every((t) => effective.includes(t))) return false;

      // キーワード: レシピ名/説明/投稿��材料名/カテゴリ名のいずれかに一致
      if (term) {
        const ingredientText = (r.ingredients ?? []).map((i: any) => i.name).join(" ");
        const hay = [
          r.title, r.description, r.source_author, ingredientText, effective.join(" "),
        ].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    setResults(list);
  }, [q, favorite, minRating, maxKcal, minProtein, maxTime, selTags]);

  useEffect(() => { const t = setTimeout(run, 250); return () => clearTimeout(t); }, [run]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input placeholder="レシピ名・材料・投稿者で検索" value={q} onChange={(e) => setQ(e.target.value)} />
        <button onClick={() => setShowFilters((s) => !s)} className="rounded-xl border border-beige bg-white p-2.5"><SlidersHorizontal size={18} /></button>
        <button onClick={() => setLayout((l) => l === "grid" ? "list" : "grid")} className="rounded-xl border border-beige bg-white p-2.5">{layout === "grid" ? <List size={18} /> : <Grid size={18} />}</button>
      </div>

      {showFilters && (
        <div className="space-y-3 rounded-2xl border border-beige bg-white p-3 text-xs">
          <label className="flex items-center gap-2"><input type="checkbox" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} /> お気に入りのみ</label>
          <div className="grid grid-cols-3 gap-2">
            <label>カロリー上限<Input type="number" value={maxKcal} onChange={(e) => setMaxKcal(e.target.value)} placeholder="kcal" /></label>
            <label>タンパク質下限<Input type="number" value={minProtein} onChange={(e) => setMinProtein(e.target.value)} placeholder="g" /></label>
            <label>調理時間以内<Input type="number" value={maxTime} onChange={(e) => setMaxTime(e.target.value)} placeholder="分" /></label>
          </div>
          <div>星評価: {[0, 1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setMinRating(n)} className={`ml-1 rounded px-1.5 py-0.5 ${minRating === n ? "bg-sage-dark text-white" : "bg-mist"}`}>{n === 0 ? "指定なし" : `${n}★+`}</button>)}</div>
          <div className="flex flex-wrap gap-1">
            {allTags.map((t) => <button key={t.id} onClick={() => setSelTags((p) => p.includes(t.name) ? p.filter((x) => x !== t.name) : [...p, t.name])} className={`rounded-full px-2 py-0.5 ${selTags.includes(t.name) ? "bg-sage-dark text-white" : "bg-mist"}`}>{t.name}</button>)}
          </div>
        </div>
      )}

      <p className="text-xs text-ink/50">{results.length}件</p>
      <div className={layout === "grid" ? "grid grid-cols-2 gap-3 sm:grid-cols-3" : "space-y-2"}>
        {results.map((r) => <RecipeCard key={r.id} r={r} layout={layout} />)}
      </div>
    </div>
  );
}
