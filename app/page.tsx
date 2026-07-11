import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { NutritionGoal } from "@/components/nutrition-goal";
import { HomeSuggest } from "@/components/home-suggest";
import { Button } from "@/components/ui/button";
import { sumPlanned } from "@/lib/nutrition";
import { PlusCircle, CalendarDays, BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

function jstToday(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export default async function HomePage() {
  const sb = getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  const today = jstToday();
  const sel = "id,title,main_image_url,cook_time_min,is_favorite,rating,status,nutrition(kcal,protein_g)";

  const [{ data: prof }, { data: recent }, { data: favs }, { count: recipeCount }, { data: todayPlans }] = await Promise.all([
    sb.from("users_profile").select("display_name, goal_kcal, goal_protein_g, goal_fat_g, goal_carb_g").eq("id", user!.id).single(),
    sb.from("recipes").select(sel).eq("user_id", user!.id).order("created_at", { ascending: false }).limit(6),
    sb.from("recipes").select(sel).eq("user_id", user!.id).eq("is_favorite", true).limit(6),
    sb.from("recipes").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
    sb.from("meal_plans").select("id, meal_type, servings, recipes(title, servings, nutrition(*))").eq("user_id", user!.id).eq("date", today),
  ]);

  const totals = sumPlanned(todayPlans ?? []);
  const goals = {
    goal_kcal: prof?.goal_kcal ?? null, goal_protein_g: prof?.goal_protein_g ?? null,
    goal_fat_g: prof?.goal_fat_g ?? null, goal_carb_g: prof?.goal_carb_g ?? null,
  };
  const remainingKcal = goals.goal_kcal != null ? goals.goal_kcal - totals.kcal : null;
  const remainingProtein = goals.goal_protein_g != null ? goals.goal_protein_g - totals.protein_g : null;
  const name = prof?.display_name || "";

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">こんにちは{name ? `、${name}さん` : ""} 👋</h1>
          <p className="text-xs text-ink/50">{new Date(today).toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}</p>
        </div>
        <Link href="/add"><Button><PlusCircle size={18} />追加</Button></Link>
      </div>

      {/* 今日の栄養 */}
      <section className="rounded-2xl border border-beige bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">今日の栄養（献立の合計）</h2>
          <Link href="/calendar" className="flex items-center gap-1 text-xs text-sage-dark"><CalendarDays size={14} />献立を編集</Link>
        </div>
        <NutritionGoal totals={totals} goals={goals} />
        {(todayPlans?.length ?? 0) === 0 && (
          <p className="mt-3 text-xs text-ink/50">今日の献立はまだありません。<Link href="/calendar" className="text-sage-dark underline">カレンダー</Link>から今日の食事にレシピを追加しましょう。</p>
        )}
      </section>

      {/* AIおすすめ */}
      <HomeSuggest remainingKcal={remainingKcal} remainingProtein={remainingProtein} />

      {/* 統計 */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/search" className="rounded-2xl border border-beige bg-white p-3">
          <div className="flex items-center gap-2 text-ink/60"><BookOpen size={16} /><span className="text-xs">保存レシピ</span></div>
          <p className="mt-1 text-2xl font-bold">{recipeCount ?? 0}<span className="text-sm font-normal text-ink/40"> 品</span></p>
        </Link>
        <Link href="/calendar" className="rounded-2xl border border-beige bg-white p-3">
          <div className="flex items-center gap-2 text-ink/60"><CalendarDays size={16} /><span className="text-xs">今日の献立</span></div>
          <p className="mt-1 text-2xl font-bold">{todayPlans?.length ?? 0}<span className="text-sm font-normal text-ink/40"> 品</span></p>
        </Link>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-ink/70">最近保存したレシピ</h2>
        {recent?.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{recent.map((r) => <RecipeCard key={r.id} r={r as any} />)}</div>
          : <EmptyState />}
      </section>

      {!!favs?.length && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink/70">お気に入り</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{favs.map((r) => <RecipeCard key={r.id} r={r as any} />)}</div>
        </section>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-beige p-8 text-center text-sm text-ink/50">
      まだレシピがありません。<br />「追加」からURL・スクショ・テキストで登録できます。
    </div>
  );
}
