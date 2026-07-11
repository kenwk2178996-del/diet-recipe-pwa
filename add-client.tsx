// Shared domain types + the canonical AI output schema (spec §7).
import { z } from "zod";

export const IngredientGroup = ["メイン食材", "調味料", "ソース", "トッピング"] as const;

export const AiIngredientSchema = z.object({
  name: z.string().min(1),
  amount: z.number().nullable().default(null),
  unit: z.string().nullable().default(null),
  note: z.string().nullable().default(null),
  group: z.enum(IngredientGroup).nullable().default(null),
});

export const AiStepSchema = z.object({
  step_no: z.number().int(),
  content: z.string().min(1),
  heat_time_min: z.number().int().nullable().default(null),
  temperature: z.string().nullable().default(null),
});

export const AiNutritionSchema = z.object({
  kcal: z.number().nullable().default(null),
  protein_g: z.number().nullable().default(null),
  fat_g: z.number().nullable().default(null),
  carb_g: z.number().nullable().default(null),
  source: z.enum(["page", "ai_estimated"]).default("ai_estimated"),
});

export const AiRecipeSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().default(null),
  cook_time_min: z.number().int().nullable().default(null),
  servings: z.number().int().nullable().default(null),
  ingredients: z.array(AiIngredientSchema).default([]),
  steps: z.array(AiStepSchema).default([]),
  nutrition: AiNutritionSchema.default({ source: "ai_estimated" } as any),
  suggested_tags: z.array(z.string()).default([]),
});

export type AiRecipe = z.infer<typeof AiRecipeSchema>;
export type AiIngredient = z.infer<typeof AiIngredientSchema>;

export type UrlKind =
  | "instagram" | "tiktok" | "youtube" | "recipe_site" | "general" | "unfetchable";

export interface IngestResult {
  kind: UrlKind;
  sourceUrl: string;
  sourceSite?: string | null;
  sourceSns?: string | null;
  sourceAuthor?: string | null;
  title?: string | null;
  mainImageUrl?: string | null;
  // Raw text handed to the AI when structured data is unavailable.
  extractedText?: string | null;
  // Populated directly when JSON-LD schema.org/Recipe is present.
  structured?: AiRecipe | null;
  notes: string[];
}
