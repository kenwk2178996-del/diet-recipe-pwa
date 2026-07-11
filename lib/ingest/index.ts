import type { IngestResult } from "@/lib/types";
import { detectUrlKind } from "./detect";
import { safeFetch } from "./ssrf";
import { parseRecipeJsonLd } from "./jsonld";
import { fetchOEmbed, fetchYoutubeDescription } from "./oembed";
import { stripTags } from "./sanitize";
import {
  buildInstagramExtractedText,
  fetchInstagramOEmbed,
  hasRecipeSignals,
  instagramErrorMessage,
  INSTAGRAM_NEXT_ACTIONS,
  normalizeInstagramUrl,
} from "./instagram";

function metaTag(html: string, prop: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i");
  return re.exec(html)?.[1] ?? null;
}

// Orchestrates spec §6. Never throws for content issues — returns partial result.
export async function ingestUrl(url: string): Promise<IngestResult> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url.trim());
  } catch {
    return {
      kind: "unfetchable",
      sourceUrl: url,
      originalSourceUrl: url,
      errorCode: "invalid_url",
      userMessage: "URLが無効です。コピーしたURLを確認してください。",
      nextActions: ["URLを貼り直す", "投稿文を貼り付ける", "手動入力へ切り替える"],
      requiresAdditionalInput: true,
      notes: ["URLが無効です。"],
      structured: null,
    };
  }

  const kind0 = detectUrlKind(url);
  const notes: string[] = [];

  // --- Instagram branch: never send Instagram pages to general JSON-LD parsing. ---
  if (kind0 === "instagram") {
    const info = normalizeInstagramUrl(url);
    if (!info) {
      return {
        kind: "instagram",
        sourceUrl: url,
        originalSourceUrl: url,
        sourceSns: "instagram",
        errorCode: "invalid_url",
        userMessage: instagramErrorMessage("invalid_url"),
        nextActions: INSTAGRAM_NEXT_ACTIONS,
        requiresAdditionalInput: true,
        structured: null,
        notes: ["Instagram URLが無効です。"],
      };
    }

    const fetchedAt = new Date().toISOString();
    const oe = await fetchInstagramOEmbed(info);
    if (!oe.ok || !oe.data) {
      const code = oe.errorCode ?? "unavailable";
      return {
        kind: "instagram",
        sourceUrl: info.normalizedUrl,
        originalSourceUrl: info.originalUrl,
        normalizedSourceUrl: info.normalizedUrl,
        instagramPostId: info.postId,
        sourceSns: "instagram",
        importMethod: "instagram_oembed",
        sourceFetchedAt: fetchedAt,
        errorCode: code,
        userMessage: instagramErrorMessage(code),
        nextActions: INSTAGRAM_NEXT_ACTIONS,
        requiresAdditionalInput: true,
        structured: null,
        notes: [instagramErrorMessage(code), oe.message].filter(Boolean) as string[],
      };
    }

    const extractedText = buildInstagramExtractedText(info, oe.data);
    const enough = hasRecipeSignals(extractedText);
    if (!enough) {
      notes.push(instagramErrorMessage("no_recipe_content"));
      notes.push("投稿文・スクリーンショット・料理画像・動画を追加してAI解析できます。");
    } else {
      notes.push("Instagram oEmbedから取得した投稿情報を使ってAI整理します。");
    }

    return {
      kind: "instagram",
      sourceUrl: info.normalizedUrl,
      originalSourceUrl: info.originalUrl,
      normalizedSourceUrl: info.normalizedUrl,
      instagramPostId: info.postId,
      sourceSns: "instagram",
      sourceAuthor: oe.data.author_name ?? null,
      title: oe.data.title ?? null,
      mainImageUrl: oe.data.thumbnail_url ?? null,
      extractedText,
      sourceRawText: extractedText,
      importMethod: "instagram_oembed",
      sourceFetchedAt: fetchedAt,
      errorCode: enough ? null : "no_recipe_content",
      userMessage: enough ? null : instagramErrorMessage("no_recipe_content"),
      nextActions: enough ? [] : INSTAGRAM_NEXT_ACTIONS,
      requiresAdditionalInput: !enough,
      structured: null,
      notes,
    };
  }

  // --- Other SNS branches: oEmbed only ---
  if (kind0 === "tiktok" || kind0 === "youtube") {
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
    res = await safeFetch(parsedUrl.toString());
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
