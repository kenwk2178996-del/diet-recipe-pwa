import { describe, it, expect } from "vitest";
import { validateAndNormalize } from "@/lib/validate";
import type { AiRecipe } from "@/lib/types";

const base: AiRecipe = {
  title: "", description: null, cook_time_min: null, servings: 1,
  ingredients: [
    { name: "卵", amount: 1, unit: "個", note: null, group: null },
    { name: "卵", amount: 2, unit: "個", note: null, group: null },
  ],
  steps: [{ step_no: 5, content: "混ぜる", heat_time_min: null, temperature: null }, { step_no: 9, content: "", heat_time_min: null, temperature: null }],
  nutrition: { kcal: 3500, protein_g: -2, fat_g: null, carb_g: null, source: "ai_estimated" },
  suggested_tags: [],
};

describe("validateAndNormalize (§4)", () => {
  const { recipe, warnings } = validateAndNormalize(base);
  it("fills empty title", () => expect(recipe.title).toBe("無題のレシピ"));
  it("merges duplicate ingredients", () => {
    expect(recipe.ingredients).toHaveLength(1);
    expect(recipe.ingredients[0].amount).toBe(3);
  });
  it("drops empty steps and renumbers", () => {
    expect(recipe.steps).toHaveLength(1);
    expect(recipe.steps[0].step_no).toBe(1);
  });
  it("warns on kcal > 3000", () => expect(warnings.some((w) => w.includes("カロリー"))).toBe(true));
  it("nullifies negative protein", () => expect(recipe.nutrition.protein_g).toBeNull());
});
