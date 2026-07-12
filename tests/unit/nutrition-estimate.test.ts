import { describe, expect, it } from "vitest";
import {
  buildNutritionEstimationText,
  mergeNutritionEstimate,
  missingNutritionFields,
  needsNutritionEstimate,
} from "@/lib/nutrition-estimate";
import type { AiRecipe } from "@/lib/types";

const baseRecipe: AiRecipe = {
  title: "鶏むねの照り焼き",
  description: null,
  cook_time_min: 15,
  servings: 2,
  ingredients: [
    { name: "鶏むね肉", amount: 300, unit: "g", note: null, group: "メイン食材" },
    { name: "醤油", amount: 1, unit: "大さじ", note: null, group: "調味料" },
  ],
  steps: [{ step_no: 1, content: "焼いて調味料を絡める", heat_time_min: null, temperature: null }],
  nutrition: { kcal: null, protein_g: null, fat_g: null, carb_g: null, source: "ai_estimated" },
  suggested_tags: [],
  ai_estimated_fields: [],
  analysis_confidence: null,
};

describe("nutrition estimate helpers", () => {
  it("detects missing nutrition fields", () => {
    expect(missingNutritionFields(baseRecipe)).toEqual(["kcal", "protein_g", "fat_g", "carb_g"]);
    expect(needsNutritionEstimate(baseRecipe)).toBe(true);
  });

  it("builds AI input from ingredients and steps", () => {
    const text = buildNutritionEstimationText(baseRecipe);
    expect(text).toContain("鶏むね肉 300g");
    expect(text).toContain("1. 焼いて調味料を絡める");
    expect(text).toContain("1人分の概算");
  });

  it("fills only missing nutrition values and records estimate fields", () => {
    const merged = mergeNutritionEstimate(baseRecipe, {
      ...baseRecipe,
      nutrition: { kcal: 250, protein_g: 35, fat_g: 5, carb_g: 8, source: "ai_estimated" },
      ai_estimated_fields: ["nutrition.kcal", "nutrition.protein_g"],
      analysis_confidence: 0.7,
    });

    expect(merged.nutrition).toMatchObject({
      kcal: 250,
      protein_g: 35,
      fat_g: 5,
      carb_g: 8,
      source: "ai_estimated",
    });
    expect(merged.ai_estimated_fields).toEqual(expect.arrayContaining([
      "nutrition.kcal",
      "nutrition.protein_g",
      "nutrition.fat_g",
      "nutrition.carb_g",
    ]));
  });

  it("keeps page values when only PFC is estimated", () => {
    const merged = mergeNutritionEstimate({
      ...baseRecipe,
      nutrition: { kcal: 320, protein_g: null, fat_g: null, carb_g: null, source: "page" },
    }, {
      ...baseRecipe,
      nutrition: { kcal: 290, protein_g: 31, fat_g: 8, carb_g: 12, source: "ai_estimated" },
    });

    expect(merged.nutrition.kcal).toBe(320);
    expect(merged.nutrition.protein_g).toBe(31);
    expect(merged.nutrition.source).toBe("ai_estimated");
  });
});
