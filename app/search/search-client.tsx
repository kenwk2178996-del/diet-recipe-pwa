"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { effectiveTagNames } from "@/lib/autotag";
import {
  groupSavedListRecipes,
  SAVED_LIST_CATEGORIES,
  type SavedListCategoryId,
} from "@/lib/recipe-categories";
import { Grid, List, SlidersHorizontal } from "lucide-react";

type ActiveCategory = "all" | SavedListCategoryId;

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
  const [activeCategory, setActiveCategory] = useState<ActiveCategory>("all");

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

      // キーワード: レシピ名/説明/投稿者/材料名/カテゴリ名のいずれかに一致
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

  const categoryGroups = useMemo(() => groupSavedListRecipes(results), [results]);
  const categoryCounts = useMemo(() => {
    return new Map(categoryGroups.map((group) => [group.id, group.recipes.length]));
  }, [categoryGroups]);
  const visibleGroups = useMemo(() => {
    if (activeCategory === "all") return categoryGroups.filter((group) => group.recipes.length > 0);
    return categoryGroups.filter((group) => group.id === activeCategory);
  }, [activeCategory, categoryGroups]);
  const cardsClass = layout === "grid" ? "grid grid-cols-2 gap-3 sm:grid-cols-3" : "space-y-2";

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

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-ink/50">{results.length}件</p>
          <p className="text-[11px] text-ink/45">目次で分類</p>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { id: "all" as const, label: "すべて", count: results.length },
            ...SAVED_LIST_CATEGORIES.map((category) => ({
              id: category.id,
              label: category.label,
              count: categoryCounts.get(category.id) ?? 0,
            })),
          ].map((category) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={activeCategory === category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                activeCategory === category.id
                  ? "border-sage-dark bg-sage-dark text-white"
                  : "border-beige bg-white text-ink"
              }`}
            >
              {category.label}
              <span className={`ml-1 ${activeCategory === category.id ? "text-white/75" : "text-ink/45"}`}>
                {category.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {results.length === 0 ? (
        <div className="rounded-xl border border-beige bg-white p-4 text-sm text-ink/60">
          条件に合う保存レシピがありません。
        </div>
      ) : (
        <div className="space-y-5">
          {visibleGroups.map((group) => (
            <section key={group.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink">{group.label}</h2>
                <span className="text-xs text-ink/45">{group.recipes.length}件</span>
              </div>
              {group.recipes.length > 0 ? (
                <div className={cardsClass}>
                  {group.recipes.map((r) => <RecipeCard key={r.id} r={r} layout={layout} />)}
                </div>
              ) : (
                <div className="rounded-xl border border-beige bg-white p-4 text-sm text-ink/60">
                  この分類の保存レシピはまだありません。
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
