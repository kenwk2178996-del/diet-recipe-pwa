import { normalizeInstagramUrl } from "./instagram-url";

export const SHARE_INSTAGRAM_URL_MISSING_MESSAGE =
  "Instagramの投稿URLを取得できませんでした。リンクをコピーして貼り付けるか、スクリーンショットを追加してください。";

export interface SharePayload {
  title?: string | null;
  text?: string | null;
  url?: string | null;
}

export interface ExtractedInstagramShareUrl {
  originalUrl: string;
  normalizedUrl: string;
  postId: string;
}

export function extractInstagramUrlFromShare(payload: SharePayload): ExtractedInstagramShareUrl | null {
  for (const candidate of orderedShareCandidates(payload)) {
    const info = normalizeInstagramUrl(candidate);
    if (info) {
      return {
        originalUrl: info.originalUrl,
        normalizedUrl: info.normalizedUrl,
        postId: info.postId,
      };
    }
  }
  return null;
}

export function extractFirstHttpUrlFromShare(payload: SharePayload): string | null {
  return orderedShareCandidates(payload)[0] ?? null;
}

export function shareTextMentionsInstagram(payload: SharePayload): boolean {
  return [payload.url, payload.text, payload.title]
    .filter(Boolean)
    .some((v) => /(?:https?:\/\/)?(?:www\.)?instagram\.com/i.test(String(v)));
}

export function combinedShareText(payload: SharePayload): string {
  return [payload.title, payload.text]
    .map((v) => String(v ?? "").trim())
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 6000);
}

function orderedShareCandidates(payload: SharePayload): string[] {
  const rawParts = [payload.url, payload.text, payload.title].map((v) => String(v ?? ""));
  const seen = new Set<string>();
  const candidates: string[] = [];

  for (const part of rawParts) {
    for (const url of extractHttpUrls(part)) {
      if (!seen.has(url)) {
        seen.add(url);
        candidates.push(url);
      }
    }
  }

  return candidates;
}

function extractHttpUrls(text: string): string[] {
  if (!text.trim()) return [];
  const variants = new Set([text, safeDecode(text)]);
  const urls: string[] = [];
  const re = /https?:\/\/[^\s"'<>()[\]{}]+/gi;

  for (const variant of variants) {
    for (const match of variant.matchAll(re)) {
      const cleaned = cleanUrlCandidate(match[0]);
      if (cleaned) urls.push(cleaned);
    }
  }

  return urls;
}

function cleanUrlCandidate(raw: string): string | null {
  let s = raw.replace(/&amp;/g, "&").trim();
  s = safeDecode(s);
  s = s.replace(/^[「『【（(<\[]+/u, "");
  while (/[)\]\}>,.。、，．!！?？;；:："'”’」』】）]+$/u.test(s)) {
    s = s.slice(0, -1);
  }
  try {
    const url = new URL(s);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
