import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
export const runtime = "nodejs";

export async function GET() {
  const sb = getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const { data } = await sb.from("tags").select("*").eq("user_id", user.id).order("category");
  return NextResponse.json({ tags: data ?? [] });
}

export async function POST(req: Request) {
  const sb = getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const { name, category } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "タグ名が必要です" }, { status: 400 });
  const { data, error } = await sb.from("tags")
    .insert({ user_id: user.id, name: name.trim(), category: category ?? "自由" })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ tag: data });
}
