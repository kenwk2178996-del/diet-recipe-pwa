import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getAiProvider } from "@/lib/ai";
import { rateLimit } from "@/lib/ratelimit";
import { AiRecipeSchema, type AiRecipe } from "@/lib/types";
import { validateAndNormalize } from "@/lib/validate";
import {
  buildNutritionEstimationText,
  hasAnyNutritionValue,
  mergeNutritionEstimate,
  missingNutritionFields,
  needsNutritionEstimate,
} from "@/lib/nutrition-estimate";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const sb = getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  if (!rateLimit(`nutrition-estimate:${user.id}`, 6, 60_000)) {
    return NextResponse.json({ error: "AI解析のリクエストが多すぎます。" }, { status: 429 });
  }

  const { data: prof } = await sb.from("users_profile").select("ai_monthly_limit").eq("id", user.id).single();
  const { data: used } = await sb.rpc("ai_calls_this_month", { uid: user.id });
  const limit = prof?.ai_monthly_limit ?? 100;
  if ((used ?? 0) >= limit) {
    return NextResponse.json({ error: "今月のAI解析上限に達しました。", limitReached: true }, { status: 402 });
  }

  const { data, error } = await sb.from("recipes")
    .select("*, ingredients(*), steps(*), nutrition(*)")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();
  if (error || !data) return NextResponse.json({ error: "レシピが見つかりません" }, { status: 404 });

  const base = recipeFromRow(data);
  if (!needsNutritionEstimate(base)) {
    return NextResponse.json({ recipe: base, warnings: ["栄養はすでに入力済みです。"] });
  }
  const missingBefore = missingNutritionFields(base).length;

  const provider = getAiProvider();
  const admin = getAdminSupabase();
  try {
    const { recipe, tokensIn, tokensOut } = await provider.structureRecipe({
      text: buildNutritionEstimationText(base, data.source_raw_text ?? null),
      sourceHint: data.source_url ? `元URL: ${data.source_url}` : null,
    });
    const { recipe: normalized, warnings } = validateAndNormalize(AiRecipeSchema.parse(recipe));
    const merged = mergeNutritionEstimate(base, normalized);
    if (!hasAnyNutritionValue(merged) || missingNutritionFields(merged).length >= missingBefore) {
      return NextResponse.json({ error: "栄養を推定できませんでした。材料や分量を確認してください。" }, { status: 422 });
    }

    await sb.from("nutrition").upsert({
      recipe_id: params.id,
      kcal: merged.nutrition.kcal,
      protein_g: merged.nutrition.protein_g,
      fat_g: merged.nutrition.fat_g,
      carb_g: merged.nutrition.carb_g,
      source: "ai_estimated",
    }, { onConflict: "recipe_id" });
    await sb.from("recipes").update({
      ai_estimated_fields: merged.ai_estimated_fields,
      analysis_confidence: merged.analysis_confidence,
    }).eq("id", params.id).eq("user_id", user.id);
    await admin.from("ai_logs").insert({
      user_id: user.id, type: "nutrition_estimate", input_kind: "text",
      tokens_in: tokensIn, tokens_out: tokensOut, success: true,
    });

    return NextResponse.json({ recipe: merged, warnings });
  } catch (e: any) {
    await admin.from("ai_logs").insert({
      user_id: user.id, type: "nutrition_estimate", input_kind: "text",
      success: false, error: String(e?.message || e),
    });
    return NextResponse.json({ error: "栄養のAI推定に失敗しました。" }, { status: 502 });
  }
}

function recipeFromRow(row: any): AiRecipe {
  const nutrition = Array.isArray(row.nutrition) ? row.nutrition[0] : row.nutrition;
  const ingredients = [...(row.ingredients ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const steps = [...(row.steps ?? [])].sort((a, b) => (a.step_no ?? 0) - (b.step_no ?? 0));

  return {
    title: row.title ?? "無題のレシピ",
    description: row.description ?? null,
    cook_time_min: row.cook_time_min ?? null,
    servings: row.servings ?? null,
    ingredients: ingredients.map((ingredient: any) => ({
      name: ingredient.name,
      amount: ingredient.amount ?? null,
      unit: ingredient.unit ?? null,
      note: ingredient.note ?? null,
      group: ingredient.group_name ?? null,
    })),
    steps: steps.map((step: any, index: number) => ({
      step_no: step.step_no ?? index + 1,
      content: step.content,
      heat_time_min: step.heat_time_min ?? null,
      temperature: step.temperature ?? null,
    })),
    nutrition: {
      kcal: nutrition?.kcal ?? null,
      protein_g: nutrition?.protein_g ?? null,
      fat_g: nutrition?.fat_g ?? null,
      carb_g: nutrition?.carb_g ?? null,
      source: nutrition?.source ?? "ai_estimated",
    },
    suggested_tags: [],
    ai_estimated_fields: row.ai_estimated_fields ?? [],
    analysis_confidence: row.analysis_confidence == null ? null : Number(row.analysis_confidence),
  };
}
