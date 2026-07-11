import { getServerSupabase } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { RecipeForm } from "@/components/recipe/recipe-form";
import type { AiRecipe } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditPage({ params }: { params: { id: string } }) {
  const sb = getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  const { data } = await sb.from("recipes").select("*, ingredients(*), steps(*), nutrition(*)").eq("id", params.id).single();
  if (!data) notFound();
  const { data: tags } = await sb.from("tags").select("id,name,category").eq("user_id", user!.id);
  const nut = Array.isArray(data.nutrition) ? data.nutrition[0] : data.nutrition;
  const initial: AiRecipe = {
    title: data.title, description: data.description, cook_time_min: data.cook_time_min, servings: data.servings,
    ingredients: (data.ingredients ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((i: any) => ({ name: i.name, amount: i.amount, unit: i.unit, note: i.note, group: i.group_name })),
    steps: (data.steps ?? []).sort((a: any, b: any) => a.step_no - b.step_no)
      .map((s: any) => ({ step_no: s.step_no, content: s.content, heat_time_min: s.heat_time_min, temperature: s.temperature })),
    nutrition: { kcal: nut?.kcal ?? null, protein_g: nut?.protein_g ?? null, fat_g: nut?.fat_g ?? null, carb_g: nut?.carb_g ?? null, source: nut?.source ?? "user_input" },
    suggested_tags: [],
  };
  return (
    <div>
      <h1 className="mb-3 text-lg font-bold">レシピを編集</h1>
      <RecipeForm initial={initial} allTags={tags ?? []} recipeId={params.id} />
    </div>
  );
}
