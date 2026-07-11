import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getAiProvider } from "@/lib/ai";
import { validateAndNormalize } from "@/lib/validate";
import { normalizeImage } from "@/lib/image";
import { rateLimit } from "@/lib/ratelimit";
import { AiRecipeSchema } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const sb = getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  if (!rateLimit(`ai:${user.id}`, 10, 60_000))
    return NextResponse.json({ error: "AI解析のリクエストが多すぎます。" }, { status: 429 });

  // Monthly quota (spec §4).
  const { data: prof } = await sb.from("users_profile").select("ai_monthly_limit").eq("id", user.id).single();
  const { data: used } = await sb.rpc("ai_calls_this_month", { uid: user.id });
  const limit = prof?.ai_monthly_limit ?? 100;
  if ((used ?? 0) >= limit)
    return NextResponse.json({ error: "今月のAI解析上限に達しました。手動入力をご利用ください。", limitReached: true }, { status: 402 });

  const form = await req.formData();
  const text = (form.get("text") as string) || null;
  const sourceHint = (form.get("sourceHint") as string) || null;
  const files = form.getAll("images").filter((f): f is File => f instanceof File);

  const images = [];
  for (const f of files.slice(0, 8)) {
    const buf = Buffer.from(await f.arrayBuffer());
    const { base64 } = await normalizeImage(buf, f.type);
    images.push({ mediaType: "image/jpeg" as const, base64 });
  }

  const admin = getAdminSupabase();
  const provider = getAiProvider();
  try {
    const { recipe, tokensIn, tokensOut } = await provider.structureRecipe({ text, images, sourceHint });
    const { recipe: normalized, warnings } = validateAndNormalize(AiRecipeSchema.parse(recipe));
    await admin.from("ai_logs").insert({
      user_id: user.id, type: "structure", input_kind: images.length ? "image" : "text",
      tokens_in: tokensIn, tokens_out: tokensOut, success: true,
    });
    return NextResponse.json({
      recipe: normalized,
      warnings,
      aiEstimatedFields: normalized.ai_estimated_fields ?? [],
      analysisConfidence: normalized.analysis_confidence ?? null,
    });
  } catch (e: any) {
    await admin.from("ai_logs").insert({
      user_id: user.id, type: "structure", input_kind: images.length ? "image" : "text",
      success: false, error: String(e?.message || e),
    });
    return NextResponse.json({ error: "AI解析に失敗しました。手動入力で続けられます。", detail: String(e?.message || e) }, { status: 502 });
  }
}
