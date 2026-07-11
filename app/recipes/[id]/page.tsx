import { getServerSupabase } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { DetailClient } from "./detail-client";

export const dynamic = "force-dynamic";

export default async function RecipeDetail({ params }: { params: { id: string } }) {
  const sb = getServerSupabase();
  const { data } = await sb.from("recipes")
    .select("*, ingredients(*), steps(*), nutrition(*), recipe_tags(tags(id,name))")
    .eq("id", params.id).single();
  if (!data) notFound();
  const ings = (data.ingredients ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);
  const steps = (data.steps ?? []).sort((a: any, b: any) => a.step_no - b.step_no);
  return <DetailClient recipe={{ ...data, ingredients: ings, steps }} />;
}
