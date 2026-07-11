import type { IngestResult } from "@/lib/types";
import { detectUrlKind } from "./detect";
import { safeFetch } from "./ssrf";
import { parseRecipeJsonLd } from "./jsonld";
import { fetchOEmbed, fetchYoutubeDescription } from "./oembed";
import { stripTags } from "./sanitize";

function metaTag(html: string, prop: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i");
  return re.exec(html)?.[1] ?? null;
}

// Orchestrates spec §6. Never throws for content issues — returns partial result.
export async function ingestUrl(url: string): Promise<IngestResult> {
  const kind0 = detectUrlKind(url);
  const notes: string[] = [];

  // --- SNS branches: oEmbed only ---
  if (kind0 === "instagram" || kind0 === "tiktok" || kind0 === "youtube") {
    const oe = await fetchOEmbed(kind0, url);
    let text = oe?.title ?? null;
    if (kind0 === "youtube") {
      const desc = await fetchYoutubeDescription(url);
      if (desc) text = [text, desc].filter(Boolean).join("\n");
      else notes.push("YouTube APIキー未設定のため説明文は取得できません（タイトルのみ）。");
    }
    if (!oe) notes.push(`${kind0}の埋め込み情報を取得できませんでした。スクショや投稿文の追加で補完できます。`);
    return {
      kind: kind0, sourceUrl: url, sourceSns: kind0,
      sourceAuthor: oe?.author_name ?? null, title: oe?.title ?? null,
      mainImageUrl: oe?.thumbnail_url ?? null, extractedText: text, structured: null, notes,
    };
  }

  // --- General fetch (may be a recipe site) ---
  let res: Response;
  try {
    res = await safeFetch(url);
  } catch (e: any) {
    return { kind: "unfetchable", sourceUrl: url, notes: [e?.message || "取得できませんでした。URLのみ保存できます。"], structured: null };
  }
  if (!res.ok) {
    return { kind: "unfetchable", sourceUrl: url, notes: [`ページ取得エラー (HTTP ${res.status})。URLのみ保存できます。`], structured: null };
  }
  const html = await res.text();
  const site = (() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; } })();
  const structured = parseRecipeJsonLd(html);
  const ogImage = metaTag(html, "og:image");
  const ogTitle = metaTag(html, "og:title") || (/<title>([^<]*)<\/title>/i.exec(html)?.[1] ?? null);

  if (structured) {
    return {
      kind: "recipe_site", sourceUrl: url, sourceSite: site, sourceAuthor: null,
      title: structured.title, mainImageUrl: ogImage, extractedText: null,
      structured, notes: ["構造化データ(JSON-LD)から取り込みました。"],
    };
  }
  // General page: hand cleaned body text to the AI later.
  const body = stripTags(html).slice(0, 12000);
  return {
    kind: "general", sourceUrl: url, sourceSite: site, sourceAuthor: null,
    title: ogTitle, mainImageUrl: ogImage, extractedText: body, structured: null,
    notes: ["ページ本文を抽出しました。AI整理で構造化します。"],
  };
}
