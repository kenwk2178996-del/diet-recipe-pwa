import { NextResponse } from "next/server";
import {
  combinedShareText,
  extractFirstHttpUrlFromShare,
  extractInstagramUrlFromShare,
  shareTextMentionsInstagram,
} from "@/lib/ingest/share-target";

export const runtime = "nodejs";

// Android share sheets post here. iOS may not expose installed PWAs, so the add screen keeps paste/screenshot fallbacks.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const payload = {
    title: (form?.get("title") as string) || "",
    text: (form?.get("text") as string) || "",
    url: (form?.get("url") as string) || "",
  };
  const dest = new URL("/add", req.url);
  dest.searchParams.set("source", "share-target");

  const instagram = extractInstagramUrlFromShare(payload);
  const sharedText = combinedShareText(payload);
  if (instagram) {
    dest.searchParams.set("url", instagram.normalizedUrl);
    if (sharedText) dest.searchParams.set("text", sharedText);
    return NextResponse.redirect(dest, 303);
  }

  const firstUrl = shareTextMentionsInstagram(payload) ? null : extractFirstHttpUrlFromShare(payload);
  if (firstUrl) dest.searchParams.set("url", firstUrl);
  else {
    dest.searchParams.set("shareError", "instagram_url_missing");
    if (sharedText) dest.searchParams.set("text", sharedText);
  }
  return NextResponse.redirect(dest, 303);
}
