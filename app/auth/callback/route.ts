import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

// OAuth (Google) + email confirmation callback.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (code) {
    const sb = getServerSupabase();
    await sb.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL("/", url.origin));
}
