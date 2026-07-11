import { safeFetch } from "./ssrf";

interface OEmbed { title?: string; author_name?: string; thumbnail_url?: string; html?: string; }

async function fetchJson(url: string): Promise<any | null> {
  try {
    const res = await safeFetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// Instagram / TikTok / YouTube oEmbed (spec §6). Falls back to null gracefully.
export async function fetchOEmbed(kind: "instagram" | "tiktok" | "youtube", url: string): Promise<OEmbed | null> {
  if (kind === "tiktok") return fetchJson(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
  if (kind === "youtube") return fetchJson(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
  // Instagram oEmbed officially requires an app token; try public endpoint, else null.
  if (kind === "instagram") {
    const token = process.env.INSTAGRAM_OEMBED_TOKEN;
    if (token) return fetchJson(`https://graph.facebook.com/v19.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${token}`);
    return null;
  }
  return null;
}

// YouTube: enrich with description text via Data API if a key is present (spec §3).
export async function fetchYoutubeDescription(url: string): Promise<string | null> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null;
  const id = extractYoutubeId(url);
  if (!id) return null;
  const data = await fetchJson(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${id}&key=${key}`
  );
  return data?.items?.[0]?.snippet?.description ?? null;
}

export function extractYoutubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    return u.searchParams.get("v");
  } catch { return null; }
}
