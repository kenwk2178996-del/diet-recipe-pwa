import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ratelimit";
import { searchRecipeCandidates } from "@/lib/discover/recipe-search";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const sb = getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  if (!rateLimit(`recipe-discover:${user.id}`, 12, 60_000)) {
    return NextResponse.json({ error: "候補検索の回数が多すぎます。少し待ってから試してください。" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (query.length < 2) {
    return NextResponse.json({ error: "探したい料理や条件を入力してください。" }, { status: 400 });
  }
  if (query.length > 120) {
    return NextResponse.json({ error: "検索条件は120文字以内で入力してください。" }, { status: 400 });
  }

  try {
    const candidates = await searchRecipeCandidates(query, 5);
    return NextResponse.json({
      candidates,
      message: candidates.length ? null : "候補が見つかりませんでした。条件を少し変えて試してください。",
    });
  } catch (e: any) {
    return NextResponse.json({
      error: e?.message || "候補検索に失敗しました。少し時間を置いて試してください。",
    }, { status: 502 });
  }
}
