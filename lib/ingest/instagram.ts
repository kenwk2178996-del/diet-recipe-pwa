import type { IngestErrorCode } from "@/lib/types";
import { safeFetch } from "./ssrf";
import { stripTags } from "./sanitize";
import type { InstagramUrlInfo } from "./instagram-url";
export { isInstagramUrl, normalizeInstagramUrl } from "./instagram-url";

export interface InstagramOEmbed {
  title?: string;
  author_name?: string;
  author_url?: string;
  provider_name?: string;
  provider_url?: string;
  thumbnail_url?: string;
  html?: string;
  media_id?: string;
}

export interface InstagramFetchResult {
  ok: boolean;
  data?: InstagramOEmbed;
  errorCode?: IngestErrorCode;
  message?: string;
  status?: number;
}

export const INSTAGRAM_NEXT_ACTIONS = [
  "投稿文を貼り付ける",
  "スクリーンショットを追加する",
  "料理画像を追加する",
  "動画を追加する",
  "手動入力へ切り替える",
];

export async function fetchInstagramOEmbed(info: InstagramUrlInfo): Promise<InstagramFetchResult> {
  const version = process.env.META_GRAPH_VERSION || process.env.INSTAGRAM_GRAPH_VERSION || "v23.0";
  const token = process.env.INSTAGRAM_OEMBED_TOKEN || process.env.META_OEMBED_TOKEN || "";
  const endpoint = new URL(`https://graph.facebook.com/${version}/instagram_oembed`);
  endpoint.searchParams.set("url", info.normalizedUrl);
  endpoint.searchParams.set("omitscript", "true");
  if (token) endpoint.searchParams.set("access_token", token);

  try {
    const res = await safeFetch(endpoint.toString());
    const text = await res.text();
    const json = safeJson(text);
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        errorCode: classifyInstagramOEmbedError(res.status, json?.error?.message || text),
        message: json?.error?.message || text || "Instagram投稿情報を取得できませんでした。",
      };
    }
    return { ok: true, status: res.status, data: json as InstagramOEmbed };
  } catch (e: any) {
    return {
      ok: false,
      errorCode: "temporary_instagram_error",
      message: e?.message || "Instagram側の一時的なエラーです。",
    };
  }
}

export function classifyInstagramOEmbedError(status: number | undefined, message = ""): IngestErrorCode {
  const m = message.toLowerCase();
  if (status === 400 && (m.includes("invalid") || m.includes("malformed"))) return "invalid_url";
  if (status === 401 || m.includes("login")) return "login_required";
  if (status === 403 || m.includes("permission") || m.includes("not public") || m.includes("private")) return "private_post";
  if (status === 404 || m.includes("does not exist") || m.includes("not found") || m.includes("deleted")) return "deleted_post";
  if (status === 429 || (status != null && status >= 500)) return "temporary_instagram_error";
  return "unavailable";
}

export function instagramErrorMessage(code: IngestErrorCode): string {
  switch (code) {
    case "private_post":
      return "非公開投稿のため、Instagramから投稿情報を取得できませんでした。";
    case "deleted_post":
      return "削除済み、または存在しない投稿です。";
    case "login_required":
      return "ログインが必要な投稿のため、投稿情報を取得できませんでした。";
    case "invalid_url":
      return "Instagram URLが無効です。投稿・リール・TVのURLを確認してください。";
    case "no_recipe_content":
      return "投稿情報は取得できましたが、材料・手順が投稿内に見つかりませんでした。";
    case "temporary_instagram_error":
      return "Instagram側の一時的なエラーで取得できませんでした。";
    default:
      return "Instagram投稿情報を取得できませんでした。";
  }
}

export function buildInstagramExtractedText(info: InstagramUrlInfo, data: InstagramOEmbed): string {
  const htmlText = stripTags(data.html || "")
    .replace(/\s+/g, " ")
    .replace(/View this post on Instagram/gi, "")
    .trim();
  return [
    `Instagram URL: ${info.normalizedUrl}`,
    data.media_id ? `Instagram media id: ${data.media_id}` : "",
    data.author_name ? `投稿者: ${data.author_name}` : "",
    data.title ? `投稿本文またはタイトル: ${stripTags(data.title)}` : "",
    htmlText ? `埋め込みから取得した表示テキスト: ${htmlText}` : "",
  ].filter(Boolean).join("\n");
}

export function hasRecipeSignals(text: string | null | undefined): boolean {
  if (!text || text.trim().length < 24) return false;
  const material = /(材料|分量|大さじ|小さじ|g|ml|個|枚|本|カップ|少々)/i.test(text);
  const step = /(作り方|手順|レシピ|混ぜ|焼|炒め|煮|茹|レンジ|加熱|切|入れ|①|1[.)、])/i.test(text);
  const nutrition = /(kcal|カロリー|タンパク|たんぱく|脂質|炭水化物|糖質|PFC)/i.test(text);
  return (material && step) || (material && nutrition) || (step && nutrition);
}

function safeJson(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
