// 栄養集計ヘルパー。献立(レシピ×人数)のPFC/kcalを合算する。
export interface NutriLike { kcal?: number | null; protein_g?: number | null; fat_g?: number | null; carb_g?: number | null }
export interface Totals { kcal: number; protein_g: number; fat_g: number; carb_g: number }

function pick(n: NutriLike | NutriLike[] | null | undefined): NutriLike {
  if (!n) return {};
  return Array.isArray(n) ? (n[0] ?? {}) : n;
}

// meal_plans の各行 { servings, recipes: { nutrition, servings } } を合算。
export function sumPlanned(rows: any[]): Totals {
  const t: Totals = { kcal: 0, protein_g: 0, fat_g: 0, carb_g: 0 };
  for (const row of rows ?? []) {
    const recipe = row.recipes ?? row.recipe;
    if (!recipe) continue;
    const n = pick(recipe.nutrition);
    const base = recipe.servings && recipe.servings > 0 ? recipe.servings : 1;
    const factor = (row.servings ?? 1) / base;
    t.kcal += (n.kcal ?? 0) * factor;
    t.protein_g += (n.protein_g ?? 0) * factor;
    t.fat_g += (n.fat_g ?? 0) * factor;
    t.carb_g += (n.carb_g ?? 0) * factor;
  }
  return {
    kcal: Math.round(t.kcal), protein_g: Math.round(t.protein_g),
    fat_g: Math.round(t.fat_g), carb_g: Math.round(t.carb_g),
  };
}

export const MEAL_TYPES = ["朝食", "昼食", "夕食", "間食"] as const;
export type MealType = (typeof MEAL_TYPES)[number];
