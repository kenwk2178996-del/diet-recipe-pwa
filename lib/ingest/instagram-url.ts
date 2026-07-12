export type InstagramMediaType = "p" | "reel" | "tv";

export interface InstagramUrlInfo {
  originalUrl: string;
  normalizedUrl: string;
  postId: string;
  mediaType: InstagramMediaType;
}

export function normalizeInstagramUrl(raw: string): InstagramUrlInfo | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(url.protocol)) return null;

  const host = url.hostname.replace(/^www\./i, "").toLowerCase();
  if (host !== "instagram.com") return null;

  const match = /^\/(p|reel|tv)\/([^/?#]+)\/?/i.exec(url.pathname);
  if (!match) return null;

  const mediaType = match[1].toLowerCase() as InstagramMediaType;
  const postId = decodeURIComponent(match[2]).trim();
  if (!postId) return null;

  return {
    originalUrl: raw.trim(),
    normalizedUrl: `https://www.instagram.com/${mediaType}/${encodeURIComponent(postId)}/`,
    postId,
    mediaType,
  };
}

export function isInstagramUrl(raw: string): boolean {
  return normalizeInstagramUrl(raw) != null;
}
