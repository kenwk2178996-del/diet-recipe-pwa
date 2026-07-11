import { createClient } from "@supabase/supabase-js";

// Service-role client: SERVER ONLY. Bypasses RLS — use only for trusted
// server-side writes (e.g. ai_logs) after verifying the user identity.
export function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
