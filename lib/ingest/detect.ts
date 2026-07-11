import type { UrlKind } from "@/lib/types";

export function detectUrlKind(raw: string): Exclude<UrlKind, "recipe_site" | "unfetchable"> {
  let u: URL;
  try { u = new URL(raw); } catch { return "general"; }
  const h = u.hostname.replace(/^www\./, "").toLowerCase();
  const p = u.pathname;
  if (h === "instagram.com" && /^\/(p|reel)\//.test(p)) return "instagram";
  if (h.endsWith("tiktok.com")) return "tiktok";
  if (h === "youtube.com" || h === "m.youtube.com" || h === "youtu.be") return "youtube";
  return "general";
}
