import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { ingestUrl } from "@/lib/ingest";
import { rateLimit } from "@/lib/ratelimit";
import type { DuplicateRecipe, IngestResult } from "@/lib/types";

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
  if (result.kind === "instagram") {
    result.duplicates = await findInstagramDuplicates(user.id, result);
  }
  return NextResponse.json(result);
}

async function findInstagramDuplicates(userId: string, result: IngestResult): Promise<DuplicateRecipe[]> {
  const sb = getServerSupabase();
  const seen = new Map<string, DuplicateRecipe>();
  const select = "id,title,source_url,normalized_source_url,instagram_post_id,main_image_url,updated_at";

  async function addBy(column: string, value?: string | null) {
    if (!value) return;
    const { data, error } = await sb.from("recipes").select(select).eq("user_id", userId).eq(column, value).limit(5);
    if (error) return;
    for (const row of data ?? []) seen.set(row.id, row as DuplicateRecipe);
  }

  await addBy("instagram_post_id", result.instagramPostId);
  await addBy("normalized_source_url", result.normalizedSourceUrl);
  await addBy("source_url", result.normalizedSourceUrl ?? result.sourceUrl);
  return [...seen.values()];
}
