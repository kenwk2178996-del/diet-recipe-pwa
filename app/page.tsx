import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const sb = getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  const sel = "id,title,main_image_url,cook_time_min,is_favorite,rating,status,nutrition(kcal,protein_g)";
  const [{ data: recent }, { data: favs }] = await Promise.all([
    sb.from("recipes").select(sel).eq("user_id", user!.id).order("created_at", { ascending: false }).limit(6),
    sb.from("recipes").select(sel).eq("user_id", user!.id).eq("is_favorite", true).limit(6),
  ]);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">こんにちは 👋</h1>
        <Link href="/add"><Button><PlusCircle size={18} />レシピ追加</Button></Link>
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
      まだレシピがありません。<br />右上の「レシピ追加」からURL・スクショ・テキストで登録できます。
    </div>
  );
}
