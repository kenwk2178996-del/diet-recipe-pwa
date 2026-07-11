import { getServerSupabase } from "@/lib/supabase/server";
import { CalendarClient } from "./calendar-client";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const sb = getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  const { data: recipes } = await sb.from("recipes")
    .select("id, title, main_image_url, nutrition(kcal, protein_g)")
    .eq("user_id", user!.id).order("created_at", { ascending: false }).limit(200);
  return <CalendarClient recipes={recipes ?? []} />;
}
