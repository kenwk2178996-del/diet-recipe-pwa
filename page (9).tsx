import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { ingestUrl } from "@/lib/ingest";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const sb = getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  if (!rateLimit(`ingest:${user.id}`, 20, 60_000))
    return NextResponse.json({ error: "リクエストが多すぎます。少し待って再試行してください。" }, { status: 429 });

  const { url } = await req.json().catch(() => ({}));
  if (!url || typeof url !== "string") return NextResponse.json({ error: "URLを指定してください" }, { status: 400 });

  const result = await ingestUrl(url);
  return NextResponse.json(result);
}
