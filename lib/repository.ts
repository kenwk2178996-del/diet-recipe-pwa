import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiRecipe } from "@/lib/types";

export interface SaveRecipeInput {
  recipe: AiRecipe;
  userId: string;
  status: "draft" | "published";
  source?: RecipeSourceInput;
  mainImageUrl?: string | null;
  nutritionSource?: "page" | "calculated" | "ai_estimated" | "user_input";
  tagIds?: string[];
}

export interface RecipeSourceInput {
  url?: string | null;
  originalUrl?: string | null;
  normalizedUrl?: string | null;
  site?: string | null;
  sns?: string | null;
  author?: string | null;
  instagramPostId?: string | null;
  importMethod?: string | null;
  fetchedAt?: string | null;
  sourceRawText?: string | null;
  aiEstimatedFields?: string[];
  analysisConfidence?: number | null;
}

// Persist a full recipe graph. RLS enforces ownership; we pass an RLS-scoped client.
export async function saveRecipe(sb: SupabaseClient, input: SaveRecipeInput): Promise<string> {
  const { recipe, userId, status, source, mainImageUrl } = input;
  const { data: rec, error } = await insertRecipeRow(sb, {
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
    ...sourceColumns(source, recipe),
  });
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

export interface UpdateRecipeGraphInput extends SaveRecipeInput {
  recipeId: string;
}

export async function updateRecipeGraph(sb: SupabaseClient, input: UpdateRecipeGraphInput): Promise<void> {
  const { recipe, userId, recipeId, status, source, mainImageUrl } = input;
  const patch = {
    title: recipe.title,
    description: recipe.description,
    main_image_url: mainImageUrl ?? null,
    cook_time_min: recipe.cook_time_min,
    servings: recipe.servings,
    source_url: source?.normalizedUrl ?? source?.url ?? null,
    source_site: source?.site ?? null,
    source_sns: source?.sns ?? null,
    source_author: source?.author ?? null,
    status,
    ...sourceColumns(source, recipe),
  };
  const { error } = await updateRecipeRow(sb, recipeId, userId, patch);
  if (error) throw error;

  for (const table of ["ingredients", "steps", "nutrition", "recipe_tags"] as const) {
    const { error: e } = await sb.from(table).delete().eq("recipe_id", recipeId);
    if (e) throw e;
  }

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
}

export async function findDuplicateRecipe(
  sb: SupabaseClient,
  userId: string,
  source?: RecipeSourceInput,
): Promise<{ id: string; title: string } | null> {
  if (!source?.instagramPostId && !source?.normalizedUrl && !source?.url) return null;
  const select = "id,title";
  if (source.instagramPostId) {
    const { data } = await sb.from("recipes").select(select).eq("user_id", userId).eq("instagram_post_id", source.instagramPostId).limit(1).maybeSingle();
    if (data) return data as { id: string; title: string };
  }
  for (const value of [source.normalizedUrl, source.url].filter(Boolean) as string[]) {
    const { data } = await sb.from("recipes").select(select).eq("user_id", userId).eq("normalized_source_url", value).limit(1).maybeSingle();
    if (data) return data as { id: string; title: string };
    const { data: bySource } = await sb.from("recipes").select(select).eq("user_id", userId).eq("source_url", value).limit(1).maybeSingle();
    if (bySource) return bySource as { id: string; title: string };
  }
  return null;
}

function sourceColumns(source: RecipeSourceInput | undefined, recipe: AiRecipe): Record<string, unknown> {
  return {
    original_source_url: source?.originalUrl ?? source?.url ?? null,
    normalized_source_url: source?.normalizedUrl ?? source?.url ?? null,
    instagram_post_id: source?.instagramPostId ?? null,
    import_method: source?.importMethod ?? null,
    source_fetched_at: source?.fetchedAt ?? null,
    ai_estimated_fields: source?.aiEstimatedFields ?? recipe.ai_estimated_fields ?? [],
    analysis_confidence: source?.analysisConfidence ?? recipe.analysis_confidence ?? null,
    source_raw_text: source?.sourceRawText ?? null,
  };
}

async function insertRecipeRow(sb: SupabaseClient, row: Record<string, unknown>) {
  const withMeta = await sb.from("recipes").insert(row).select("id").single();
  if (!isMissingColumnError(withMeta.error)) return withMeta;
  const fallback = { ...row };
  for (const key of Object.keys(sourceColumns(undefined, row as unknown as AiRecipe))) delete fallback[key];
  return sb.from("recipes").insert(fallback).select("id").single();
}

async function updateRecipeRow(sb: SupabaseClient, recipeId: string, userId: string, row: Record<string, unknown>) {
  const withMeta = await sb.from("recipes").update(row).eq("id", recipeId).eq("user_id", userId);
  if (!isMissingColumnError(withMeta.error)) return withMeta;
  const fallback = { ...row };
  for (const key of Object.keys(sourceColumns(undefined, row as unknown as AiRecipe))) delete fallback[key];
  return sb.from("recipes").update(fallback).eq("id", recipeId).eq("user_id", userId);
}

function isMissingColumnError(error: any): boolean {
  const msg = String(error?.message || "");
  return Boolean(error) && (msg.includes("column") || error?.code === "42703");
}
