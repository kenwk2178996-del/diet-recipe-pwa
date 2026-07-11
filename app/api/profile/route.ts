import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
export const runtime = "nodejs";

// PATCH { goal_kcal, goal_protein_g, goal_fat_g, goal_carb_g, display_name } — 目標値更新
export async function PATCH(req: Request) {
  const sb = getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const allowed = ["goal_kcal", "goal_protein_g", "goal_fat_g", "goal_carb_g", "display_name"];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (k in b) update[k] = b[k] === "" ? null : b[k];
  const { error } = await sb.from("users_profile").update(update).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
