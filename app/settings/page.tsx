import { getServerSupabase } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const sb = getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  const { data: prof } = await sb.from("users_profile").select("*").eq("id", user!.id).single();
  const { data: used } = await sb.rpc("ai_calls_this_month", { uid: user!.id });
  return <SettingsClient email={user!.email ?? ""} profile={prof} aiUsed={used ?? 0} />;
}
