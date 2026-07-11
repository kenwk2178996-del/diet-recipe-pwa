import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { updateRecipeGraph } from "@/lib/repository";
import { AiRecipeSchema } from "@/lib/types";
import { validateAndNormalize } from "@/lib/validate";
import { detectTags } from "@/lib/autotag";

export const runtime = "nodejs";

async function requireUser() {
  const sb = getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  return { sb, user };
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { sb, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const { data, error } = await sb.from("recipes")
    .select("*, ingredients(*), steps(*), nutrition(*), recipe_tags(tag_id, tags(id,name,category))")
    .eq("id", params.id).single();
  if (error) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  return NextResponse.json({ recipe: data });
}

// PATCH — partial updates: favorite, rating, memo, cooked, fields.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { sb, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const patch = await req.json().catch(() => ({}));
  if (patch.recipe) {
    const parsed = AiRecipeSchema.safeParse(patch.recipe);
    if (!parsed.success) return NextResponse.json({ error: "レシピ形式が不正です", issues: parsed.error.issues }, { status: 400 });
    const { recipe } = validateAndNormalize(parsed.data);
    let mergedTagIds: string[] = Array.isArray(patch.tagIds) ? [...patch.tagIds] : [];
    try {
      const detected = detectTags({
        title: recipe.title, ingredients: recipe.ingredients, steps: recipe.steps,
        cook_time_min: recipe.cook_time_min, nutrition: recipe.nutrition,
      });
      if (detected.length) {
        const { data: tagRows } = await sb.from("tags").select("id,name").eq("user_id", user.id).in("name", detected);
        for (const t of tagRows ?? []) mergedTagIds.push(t.id as string);
      }
    } catch { /* 自動タグ付けは失敗しても更新は続行 */ }
    mergedTagIds = [...new Set(mergedTagIds)];

    try {
      await updateRecipeGraph(sb, {
        recipeId: params.id,
        recipe,
        userId: user.id,
        status: patch.status === "published" ? "published" : "draft",
        source: patch.source,
        mainImageUrl: patch.mainImageUrl ?? null,
        nutritionSource: patch.nutritionSource,
        tagIds: mergedTagIds,
      });
      return NextResponse.json({ ok: true, id: params.id });
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || "保存に失敗しました" }, { status: 400 });
    }
  }

  const allowed = ["title","description","cook_time_min","servings","is_favorite","rating","memo","cooked_count","last_cooked_at","status","main_image_url"];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (k in patch) update[k] = patch[k];
  if (patch.markCooked) { update.cooked_count = (patch.cooked_count ?? 0) + 1; update.last_cooked_at = new Date().toISOString(); }
  const { error } = await sb.from("recipes").update(update).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { sb, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const { error } = await sb.from("recipes").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
