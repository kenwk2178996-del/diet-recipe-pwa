import { getServerSupabase } from "@/lib/supabase/server";
import { AddClient } from "./add-client";

export const dynamic = "force-dynamic";

export default async function AddPage({ searchParams }: { searchParams: { url?: string; text?: string } }) {
  const sb = getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  const { data: tags } = await sb.from("tags").select("id,name,category").eq("user_id", user!.id);
  return <AddClient allTags={tags ?? []} initialUrl={searchParams.url ?? ""} initialText={searchParams.text ?? ""} />;
}
