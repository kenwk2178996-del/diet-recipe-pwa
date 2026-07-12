import type { AiRecipe } from "@/lib/types";

export const NUTRITION_KEYS = ["kcal", "protein_g", "fat_g", "carb_g"] as const;
export type NutritionKey = (typeof NUTRITION_KEYS)[number];

export function missingNutritionFields(recipe: Pick<AiRecipe, "nutrition">): NutritionKey[] {
  return NUTRITION_KEYS.filter((key) => recipe.nutrition?.[key] == null);
}

export function hasAnyNutritionValue(recipe: Pick<AiRecipe, "nutrition">): boolean {
  return NUTRITION_KEYS.some((key) => recipe.nutrition?.[key] != null);
}

export function needsNutritionEstimate(recipe: Pick<AiRecipe, "ingredients" | "nutrition">): boolean {
  return recipe.ingredients.length > 0 && missingNutritionFields(recipe).length > 0;
}

export function buildNutritionEstimationText(recipe: AiRecipe, extraText?: string | null): string {
  const ingredients = recipe.ingredients
    .map((ingredient) => {
      const amount = ingredient.amount == null ? "" : String(ingredient.amount);
      const unit = ingredient.unit ?? "";
      const note = ingredient.note ? ` (${ingredient.note})` : "";
      return `- ${ingredient.name} ${amount}${unit}${note}`.trim();
    })
    .join("\n");
  const steps = recipe.steps.map((step) => `${step.step_no}. ${step.content}`).join("\n");
  const existingNutrition = NUTRITION_KEYS
    .map((key) => `${key}: ${recipe.nutrition?.[key] ?? "未記載"}`)
    .join(", ");

  return [
    "ページ内に未記載の栄養を、材料・分量・手順から1人分の概算として推定してください。",
    "推定した栄養項目は必ず ai_estimated_fields に入れ、nutrition.source は ai_estimated にしてください。",
    "",
    `レシピ名: ${recipe.title}`,
    recipe.description ? `説明: ${recipe.description}` : "",
    recipe.servings ? `人数: ${recipe.servings}人分` : "人数: 未記載",
    recipe.cook_time_min ? `調理時間: ${recipe.cook_time_min}分` : "",
    `既存の栄養: ${existingNutrition}`,
    "",
    "材料:",
    ingredients || "材料なし",
    "",
    "作り方:",
    steps || "手順なし",
    extraText ? `\n補足テキスト:\n${extraText}` : "",
  ].filter(Boolean).join("\n");
}

export function mergeNutritionEstimate(base: AiRecipe, estimate: AiRecipe): AiRecipe {
  const nutrition = { ...base.nutrition };
  const estimatedFields = new Set(base.ai_estimated_fields ?? []);
  const estimateFields = new Set(estimate.ai_estimated_fields ?? []);
  let filledNutrition = false;

  for (const key of NUTRITION_KEYS) {
    const next = estimate.nutrition?.[key];
    if (nutrition[key] == null && typeof next === "number" && Number.isFinite(next)) {
      nutrition[key] = next;
      estimatedFields.add(`nutrition.${key}`);
      filledNutrition = true;
    }
  }

  if (filledNutrition) {
    nutrition.source = "ai_estimated";
  }

  if (base.cook_time_min == null && typeof estimate.cook_time_min === "number") {
    estimatedFields.add("cook_time_min");
  }
  if (base.servings == null && typeof estimate.servings === "number") {
    estimatedFields.add("servings");
  }
  for (const field of estimateFields) estimatedFields.add(field);

  return {
    ...base,
    cook_time_min: base.cook_time_min ?? estimate.cook_time_min,
    servings: base.servings ?? estimate.servings,
    nutrition,
    suggested_tags: [...new Set([...(base.suggested_tags ?? []), ...(estimate.suggested_tags ?? [])])],
    ai_estimated_fields: [...estimatedFields],
    analysis_confidence: Math.max(base.analysis_confidence ?? 0, estimate.analysis_confidence ?? 0) || null,
  };
}
