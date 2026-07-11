import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

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
