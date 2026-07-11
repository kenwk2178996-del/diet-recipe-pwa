import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";
export const runtime = "nodejs";
export const maxDuration = 30;

interface Cand { id: string; title: string; kcal: number | null; protein_g: number | null; tags: string[] }

// POST { remainingKcal?, remainingProtein? } — 保存レシピから今日の1品を提案
export async function POST(req: Request) {
  const sb = getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const remainingKcal: number | null = typeof b.remainingKcal === "number" ? b.remainingKcal : null;
  const remainingProtein: number | null = typeof b.remainingProtein === "number" ? b.remainingProtein : null;

  const { data: recipes } = await sb.from("recipes")
    .select("id, title, nutrition(kcal, protein_g), recipe_tags(tags(name))")
    .eq("user_id", user.id).eq("status", "published").limit(40);
  const cands: Cand[] = (recipes ?? []).map((r: any) => ({
    id: r.id, title: r.title,
    kcal: (Array.isArray(r.nutrition) ? r.nutrition[0] : r.nutrition)?.kcal ?? null,
    protein_g: (Array.isArray(r.nutrition) ? r.nutrition[0] : r.nutrition)?.protein_g ?? null,
    tags: (r.recipe_tags ?? []).map((rt: any) => rt.tags?.name).filter(Boolean),
  }));
  if (cands.length === 0)
    return NextResponse.json({ error: "まずレシピを保存してください", empty: true }, { status: 200 });

  // --- ヒューリスティックのフォールバック(常に返せるように) ---
  const heuristic = () => {
    let pool = cands;
    if (remainingKcal != null) pool = pool.filter((c) => c.kcal == null || c.kcal <= remainingKcal + 50);
    if (pool.length === 0) pool = cands;
    pool = [...pool].sort((a, b) => (b.protein_g ?? 0) - (a.protein_g ?? 0));
    const pick = pool[Math.floor(Math.random() * Math.min(3, pool.length))];
    const reason = remainingProtein != null && (pick.protein_g ?? 0) > 0
      ? `残りのタンパク質(${Math.round(remainingProtein)}g)を補いやすい高タンパクな一品です。`
      : "栄養バランスがよく、ダイエット中でも取り入れやすい一品です。";
    return { id: pick.id, reason };
  };

  const admin = getAdminSupabase();
  const key = process.env.ANTHROPIC_API_KEY;
  let result = heuristic();

  if (key && key !== "sk-ant-placeholder") {
    try {
      const client = new Anthropic({ apiKey: key });
      const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
      const list = cands.map((c) => `- id:${c.id} | ${c.title} | ${c.kcal ?? "?"}kcal | P${c.protein_g ?? "?"}g | ${c.tags.join(",")}`).join("\n");
      const ctx = [
        remainingKcal != null ? `今日の残りカロリー目安: ${Math.round(remainingKcal)}kcal` : "",
        remainingProtein != null ? `今日の残りタンパク質目安: ${Math.round(remainingProtein)}g` : "",
      ].filter(Boolean).join(" / ") || "特に制約なし";
      const res = await client.messages.create({
        model, max_tokens: 300,
        system: "あなたはダイエットを支援する管理栄養士です。保存済みレシピの中から今日おすすめの1品を選び、選んだレシピのidと、20〜40文字の日本語の理由をJSONで返します。",
        tools: [{
          name: "recommend", description: "おすすめを返す",
          input_schema: { type: "object", properties: { id: { type: "string" }, reason: { type: "string" } }, required: ["id", "reason"] },
        } as any],
        tool_choice: { type: "tool", name: "recommend" },
        messages: [{ role: "user", content: `条件: ${ctx}\n候補レシピ:\n${list}\n\nこの中から今日の1品を選んでください。` }],
      });
      const tu = res.content.find((c) => c.type === "tool_use");
      if (tu && tu.type === "tool_use") {
        const out = tu.input as { id: string; reason: string };
        if (cands.some((c) => c.id === out.id)) result = { id: out.id, reason: out.reason };
      }
      await admin.from("ai_logs").insert({ user_id: user.id, type: "suggest", input_kind: "text", tokens_in: res.usage.input_tokens, tokens_out: res.usage.output_tokens, success: true });
    } catch (e: any) {
      await admin.from("ai_logs").insert({ user_id: user.id, type: "suggest", input_kind: "text", success: false, error: String(e?.message || e) });
      // フォールバックのheuristic結果をそのまま使う
    }
  }

  const chosen = cands.find((c) => c.id === result.id)!;
  return NextResponse.json({ recipeId: chosen.id, title: chosen.title, reason: result.reason });
}
