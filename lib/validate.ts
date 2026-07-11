import type { AiRecipe } from "@/lib/types";

export interface ValidationResult { recipe: AiRecipe; warnings: string[]; }

// Server-side validation + normalisation (spec §4).
export function validateAndNormalize(input: AiRecipe): ValidationResult {
  const warnings: string[] = [];
  const r: AiRecipe = structuredClone(input);

  if (!r.title?.trim()) { r.title = "無題のレシピ"; warnings.push("タイトルが空だったため仮の名称を設定しました。"); }

  // Numeric coercion for ingredient amounts.
  r.ingredients = r.ingredients.map((i) => ({
    ...i,
    amount: typeof i.amount === "number" && Number.isFinite(i.amount) ? i.amount : (i.amount == null ? null : Number(i.amount) || null),
  }));

  // Merge duplicate ingredients (same name+unit): sum amounts when both numeric.
  const merged = new Map<string, (typeof r.ingredients)[number]>();
  for (const ing of r.ingredients) {
    const key = `${ing.name.trim().toLowerCase()}|${ing.unit ?? ""}`;
    const prev = merged.get(key);
    if (prev) {
      if (typeof prev.amount === "number" && typeof ing.amount === "number") prev.amount += ing.amount;
      else if (prev.amount == null) prev.amount = ing.amount;
      if (!prev.note && ing.note) prev.note = ing.note;
    } else merged.set(key, { ...ing, name: ing.name.trim() });
  }
  if (merged.size !== r.ingredients.length) warnings.push("重複する材料を統合しました。");
  r.ingredients = [...merged.values()];

  // Re-number steps.
  r.steps = r.steps
    .filter((s) => s.content?.trim())
    .map((s, idx) => ({ ...s, step_no: idx + 1 }));

  // Nutrition sanity: >3000 kcal per serving warning (spec §4).
  const kcal = r.nutrition?.kcal;
  if (typeof kcal === "number" && kcal > 3000) {
    warnings.push(`カロリーが${Math.round(kcal)}kcalと高すぎます。1人分の値か確認してください。`);
  }
  for (const [k, label] of [["protein_g", "たんぱく質"], ["fat_g", "脂質"], ["carb_g", "炭水化物"]] as const) {
    const v = (r.nutrition as any)[k];
    if (v != null && (typeof v !== "number" || v < 0)) { (r.nutrition as any)[k] = null; warnings.push(`${label}の値が不正なため無視しました。`); }
  }

  if (r.ingredients.length === 0) warnings.push("材料が抽出できませんでした。手動で追加してください。");
  if (r.steps.length === 0) warnings.push("手順が抽出できませんでした。手動で追加してください。");

  return { recipe: r, warnings };
}
