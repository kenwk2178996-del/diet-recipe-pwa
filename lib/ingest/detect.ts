import type { UrlKind } from "@/lib/types";
import { isInstagramUrl } from "./instagram-url";

export function detectUrlKind(raw: string): Exclude<UrlKind, "recipe_site" | "unfetchable"> {
  let u: URL;
  try { u = new URL(raw); } catch { return "general"; }
  const h = u.hostname.replace(/^www\./, "").toLowerCase();
  if (h === "instagram.com" && isInstagramUrl(raw)) return "instagram";
  if (h.endsWith("tiktok.com")) return "tiktok";
  if (h === "youtube.com" || h === "m.youtube.com" || h === "youtu.be") return "youtube";
  return "general";
}
