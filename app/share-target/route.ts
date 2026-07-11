import { NextResponse } from "next/server";
export const runtime = "nodejs";

// Android share sheet posts here. iOS is unsupported -> clipboard fallback (spec §6).
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const url = (form?.get("url") as string) || "";
  const text = (form?.get("text") as string) || "";
  const firstUrl = url || (text.match(/https?:\/\/\S+/)?.[0] ?? "");
  const dest = new URL("/add", req.url);
  if (firstUrl) dest.searchParams.set("url", firstUrl);
  else if (text) dest.searchParams.set("text", text);
  // NOTE: shared images are handled client-side after redirect in a full build.
  return NextResponse.redirect(dest, 303);
}
