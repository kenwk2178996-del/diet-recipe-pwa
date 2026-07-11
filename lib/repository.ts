import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiRecipe } from "@/lib/types";

export interface SaveRecipeInput {
  recipe: AiRecipe;
  userId: string;
  status: "draft" | "published";
  source?: { url?: string | null; site?: string | null; sns?: string | null; author?: string | null };
  mainImageUrl?: string | null;
  nutritionSource?: "page" | "calculated" | "ai_estimated" | "user_input";
  tagIds?: string[];
}

// Persist a full recipe graph. RLS enforces ownership; we pass an RLS-scoped client.
export async function saveRecipe(sb: SupabaseClient, input: SaveRecipeInput): Promise<string> {
  const { recipe, userId, status, source, mainImageUrl } = input;
  const { data: rec, error } = await sb.from("recipes").insert({
    user_id: userId,
    title: recipe.title,
    description: recipe.description,
    main_image_url: mainImageUrl ?? null,
    cook_time_min: recipe.cook_time_min,
    servings: recipe.servings,
    source_url: source?.url ?? null,
    source_site: source?.site ?? null,
    source_sns: source?.sns ?? null,
    source_author: source?.author ?? null,
    status,
  }).select("id").single();
  if (error) throw error;
  const recipeId = rec.id as string;

  if (recipe.ingredients.length) {
    const rows = recipe.ingredients.map((i, idx) => ({
      recipe_id: recipeId, name: i.name, amount: i.amount, unit: i.unit,
      note: i.note, group_name: i.group, sort_order: idx,
    }));
    const { error: e } = await sb.from("ingredients").insert(rows); if (e) throw e;
  }
  if (recipe.steps.length) {
    const rows = recipe.steps.map((s) => ({
      recipe_id: recipeId, step_no: s.step_no, content: s.content,
      heat_time_min: s.heat_time_min, temperature: s.temperature,
    }));
    const { error: e } = await sb.from("steps").insert(rows); if (e) throw e;
  }
  const n = recipe.nutrition;
  if (n && (n.kcal != null || n.protein_g != null || n.fat_g != null || n.carb_g != null)) {
    const { error: e } = await sb.from("nutrition").insert({
      recipe_id: recipeId, kcal: n.kcal, protein_g: n.protein_g, fat_g: n.fat_g,
      carb_g: n.carb_g, source: input.nutritionSource ?? n.source,
    }); if (e) throw e;
  }
  if (input.tagIds?.length) {
    const rows = input.tagIds.map((tag_id) => ({ recipe_id: recipeId, tag_id }));
    const { error: e } = await sb.from("recipe_tags").insert(rows); if (e) throw e;
  }
  return recipeId;
}
