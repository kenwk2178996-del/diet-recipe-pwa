import type { AiRecipe } from "@/lib/types";
import { stripTags } from "./sanitize";

// Extract a schema.org/Recipe from JSON-LD blocks (spec §6 recipe sites).
export function parseRecipeJsonLd(html: string): AiRecipe | null {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of blocks) {
    let data: any;
    try { data = JSON.parse(m[1].trim()); } catch { continue; }
    const node = findRecipeNode(data);
    if (node) return mapRecipe(node);
  }
  return null;
}

function findRecipeNode(data: any): any | null {
  const arr = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];
  for (const n of arr) {
    const t = n?.["@type"];
    const types = Array.isArray(t) ? t : [t];
    if (types.includes("Recipe")) return n;
  }
  return null;
}

function toInt(v: any): number | null {
  if (v == null) return null;
  // ISO 8601 durations e.g. PT30M / PT1H15M
  if (typeof v === "string" && /^PT/i.test(v)) {
    const h = /(\d+)H/i.exec(v); const mi = /(\d+)M/i.exec(v);
    return (h ? +h[1] * 60 : 0) + (mi ? +mi[1] : 0) || null;
  }
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

function mapRecipe(n: any): AiRecipe {
  const ingredients = (n.recipeIngredient || n.ingredients || []).map((raw: string) => ({
    name: stripTags(String(raw)), amount: null, unit: null, note: null, group: null,
  }));
  const instr = n.recipeInstructions;
  const flat: string[] = [];
  const walk = (x: any) => {
    if (!x) return;
    if (typeof x === "string") flat.push(stripTags(x));
    else if (Array.isArray(x)) x.forEach(walk);
    else if (x.text) flat.push(stripTags(x.text));
    else if (x.itemListElement) walk(x.itemListElement);
  };
  walk(instr);
  const steps = flat.filter(Boolean).map((content, i) => ({
    step_no: i + 1, content, heat_time_min: null, temperature: null,
  }));
  const img = Array.isArray(n.image) ? (n.image[0]?.url || n.image[0]) : (n.image?.url || n.image);
  const nut = n.nutrition || {};
  return {
    title: stripTags(String(n.name || "無題のレシピ")),
    description: n.description ? stripTags(String(n.description)) : null,
    cook_time_min: toInt(n.totalTime || n.cookTime || n.prepTime),
    servings: toInt(n.recipeYield),
    ingredients,
    steps,
    nutrition: {
      kcal: parseFloat(nut.calories) || null,
      protein_g: parseFloat(nut.proteinContent) || null,
      fat_g: parseFloat(nut.fatContent) || null,
      carb_g: parseFloat(nut.carbohydrateContent) || null,
      source: nut.calories ? "page" : "ai_estimated",
    },
    suggested_tags: [],
  };
}
