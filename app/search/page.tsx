import { getServerSupabase } from "@/lib/supabase/server";
import { SearchClient } from "./search-client";
export const dynamic = "force-dynamic";
export default async function SearchPage() {
  const sb = getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  const { data: tags } = await sb.from("tags").select("id,name,category").eq("user_id", user!.id).order("category");
  return <SearchClient allTags={tags ?? []} />;
}
