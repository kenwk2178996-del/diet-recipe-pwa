import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { saveRecipe } from "@/lib/repository";
import { AiRecipeSchema } from "@/lib/types";
import { validateAndNormalize } from "@/lib/validate";

export const runtime = "nodejs";

// GET /api/recipes — list with search + filters (spec §5).
export async function GET(req: Request) {
  const sb = getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const p = new URL(req.url).searchParams;
  const q = p.get("q")?.trim();
  const sort = p.get("sort") || "created_desc";
  const page = Math.max(0, parseInt(p.get("page") || "0", 10));
  const size = Math.min(50, parseInt(p.get("size") || "20", 10));

  let query = sb.from("recipes").select("*, nutrition(*), recipe_tags(tag_id, tags(name))", { count: "exact" }).eq("user_id", user.id);

  if (p.get("favorite") === "1") query = query.eq("is_favorite", true);
  if (p.get("status")) query = query.eq("status", p.get("status"));
  const minRating = p.get("minRating"); if (minRating) query = query.gte("rating", +minRating);
  const maxTime = p.get("maxTime"); if (maxTime) query = query.lte("cook_time_min", +maxTime);
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,source_author.ilike.%${q}%`);

  const order = { created_desc: ["created_at", false], created_asc: ["created_at", true], rating_desc: ["rating", false], cooked_desc: ["cooked_count", false] }[sort] as [string, boolean] ?? ["created_at", false];
  query = query.order(order[0], { ascending: order[1] }).range(page * size, page * size + size - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ recipes: data, count });
}

// POST /api/recipes — create (manual or from confirm screen).
export async function POST(req: Request) {
  const sb = getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "不正なリクエスト" }, { status: 400 });

  const parsed = AiRecipeSchema.safeParse(body.recipe);
  if (!parsed.success) return NextResponse.json({ error: "レシピ形式が不正です", issues: parsed.error.issues }, { status: 400 });
  const { recipe } = validateAndNormalize(parsed.data);

  try {
    const id = await saveRecipe(sb, {
      recipe, userId: user.id, status: body.status === "published" ? "published" : "draft",
      source: body.source, mainImageUrl: body.mainImageUrl ?? null,
      nutritionSource: body.nutritionSource, tagIds: body.tagIds,
    });
    return NextResponse.json({ id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "保存に失敗しました" }, { status: 400 });
  }
}
