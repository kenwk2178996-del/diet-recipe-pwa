import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
export const runtime = "nodejs";

// GET ?from=YYYY-MM-DD&to=YYYY-MM-DD — 期間の献立(レシピ・栄養つき)
export async function GET(req: Request) {
  const sb = getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const p = new URL(req.url).searchParams;
  const from = p.get("from"); const to = p.get("to");
  let q = sb.from("meal_plans")
    .select("id, date, meal_type, servings, recipe_id, recipes(id, title, main_image_url, servings, nutrition(*))")
    .eq("user_id", user.id);
  if (from) q = q.gte("date", from);
  if (to) q = q.lte("date", to);
  const { data, error } = await q.order("date");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ plans: data ?? [] });
}

// POST { date, meal_type, recipe_id, servings } — 献立に追加
export async function POST(req: Request) {
  const sb = getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const b = await req.json().catch(() => null);
  if (!b?.date || !b?.meal_type || !b?.recipe_id)
    return NextResponse.json({ error: "date/meal_type/recipe_id が必要です" }, { status: 400 });
  const { data, error } = await sb.from("meal_plans").insert({
    user_id: user.id, date: b.date, meal_type: b.meal_type,
    recipe_id: b.recipe_id, servings: b.servings ?? 1,
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id });
}

// DELETE ?id=... — 献立から削除
export async function DELETE(req: Request) {
  const sb = getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id が必要です" }, { status: 400 });
  const { error } = await sb.from("meal_plans").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
