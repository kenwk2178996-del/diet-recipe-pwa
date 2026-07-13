import { stripTags } from "@/lib/ingest/sanitize";
import { safeFetch } from "@/lib/ingest/ssrf";

export interface RecipeSearchCandidate {
  title: string;
  url: string;
  site: string;
  summary: string;
  imageUrl: string | null;
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

const RECIPE_HINTS = ["レシピ", "作り方", "材料", "料理", "献立", "調理", "recipe"];
const SKIP_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "instagram.com",
  "www.instagram.com",
  "tiktok.com",
  "www.tiktok.com",
]);

export function buildRecipeSearchQuery(query: string): string {
  const normalized = query.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return RECIPE_HINTS.some((hint) => normalized.toLowerCase().includes(hint.toLowerCase()))
    ? normalized
    : `${normalized} レシピ`;
}

export async function searchRecipeCandidates(query: string, limit = 5): Promise<RecipeSearchCandidate[]> {
  const q = buildRecipeSearchQuery(query);
  if (q.length < 2) return [];

  let results = await fetchBingRssResults(q);
  if (!results.length) results = await fetchDuckDuckGoResults(q);
  results = results
    .filter((result) => isUsefulRecipeResult(result))
    .slice(0, Math.max(limit * 2, limit));

  const candidates = await Promise.all(results.map((result) => enrichCandidate(result)));
  return dedupeCandidates(candidates).slice(0, limit);
}

async function fetchBingRssResults(q: string): Promise<SearchResult[]> {
  const searchUrl = new URL("https://www.bing.com/search");
  searchUrl.searchParams.set("format", "rss");
  searchUrl.searchParams.set("q", q);
  searchUrl.searchParams.set("setlang", "ja-JP");
  searchUrl.searchParams.set("cc", "JP");

  const res = await fetch(searchUrl.toString(), {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; DietRecipeBot/1.0; +https://diet-recipe-pwa.vercel.app)",
      accept: "application/rss+xml, application/xml, text/xml",
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) return [];
  return parseBingRssRecipeResults(await res.text());
}

async function fetchDuckDuckGoResults(q: string): Promise<SearchResult[]> {
  const searchUrl = new URL("https://html.duckduckgo.com/html/");
  searchUrl.searchParams.set("q", q);
  searchUrl.searchParams.set("kl", "jp-jp");

  const res = await fetch(searchUrl.toString(), {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; DietRecipeBot/1.0; +https://diet-recipe-pwa.vercel.app)",
      accept: "text/html",
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) return [];
  return parseDuckDuckGoRecipeResults(await res.text());
}

export function parseBingRssRecipeResults(xml: string): SearchResult[] {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
  return dedupeResults(items.map((item) => {
    const body = item[1];
    return {
      title: cleanText(xmlTag(body, "title") ?? ""),
      url: cleanUrl(xmlTag(body, "link") ?? ""),
      snippet: cleanText(xmlTag(body, "description") ?? ""),
    };
  }).filter((result) => result.title && result.url));
}

export function parseDuckDuckGoRecipeResults(html: string): SearchResult[] {
  const blocks = html.split(/<div[^>]+class=["'][^"']*\bresult\b[^"']*["'][^>]*>/i).slice(1);
  const results: SearchResult[] = [];

  for (const block of blocks) {
    const anchor = /<a[^>]+class=["'][^"']*\bresult__a\b[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i.exec(block);
    if (!anchor) continue;
    const url = unwrapDuckDuckGoUrl(anchor[1]);
    if (!url) continue;

    const snippetMatch =
      /<a[^>]+class=["'][^"']*\bresult__snippet\b[^"']*["'][^>]*>([\s\S]*?)<\/a>/i.exec(block)
      ?? /<div[^>]+class=["'][^"']*\bresult__snippet\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i.exec(block);

    results.push({
      title: cleanText(anchor[2]),
      url,
      snippet: snippetMatch ? cleanText(snippetMatch[1]) : "",
    });
  }

  return dedupeResults(results);
}

export function unwrapDuckDuckGoUrl(rawHref: string): string | null {
  try {
    const url = new URL(htmlDecode(rawHref), "https://duckduckgo.com");
    const uddg = url.searchParams.get("uddg");
    const target = uddg ? new URL(uddg) : url;
    if (target.protocol !== "http:" && target.protocol !== "https:") return null;
    return target.toString();
  } catch {
    return null;
  }
}

async function enrichCandidate(result: SearchResult): Promise<RecipeSearchCandidate> {
  const fallback = candidateFromResult(result);
  try {
    const res = await safeFetch(result.url, { maxRedirects: 2 });
    if (!res.ok) return fallback;
    const html = await res.text();
    const title = metaTag(html, "og:title") || metaTag(html, "twitter:title") || fallback.title;
    const description = metaTag(html, "og:description") || metaTag(html, "description") || fallback.summary;
    const image = metaTag(html, "og:image") || metaTag(html, "twitter:image");
    const summary = summarize(description || stripTags(html).slice(0, 600));

    return {
      title: summarizeTitle(title),
      url: result.url,
      site: fallback.site,
      summary: summary || fallback.summary,
      imageUrl: absolutizeUrl(image, result.url),
    };
  } catch {
    return fallback;
  }
}

function candidateFromResult(result: SearchResult): RecipeSearchCandidate {
  return {
    title: summarizeTitle(result.title),
    url: result.url,
    site: siteName(result.url),
    summary: summarize(result.snippet || `${siteName(result.url)}のレシピ候補です。`),
    imageUrl: null,
  };
}

function isUsefulRecipeResult(result: SearchResult): boolean {
  try {
    const host = new URL(result.url).hostname.replace(/^www\./, "");
    if (SKIP_HOSTS.has(host)) return false;
    if (/\.(pdf|jpg|jpeg|png|gif|webp)$/i.test(new URL(result.url).pathname)) return false;
  } catch {
    return false;
  }
  const hay = `${result.title} ${result.snippet} ${result.url}`.toLowerCase();
  return RECIPE_HINTS.some((hint) => hay.includes(hint.toLowerCase()));
}

function metaTag(html: string, prop: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${escapeRegExp(prop)}["'][^>]+content=["']([^"']+)["']`, "i");
  const swapped = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escapeRegExp(prop)}["']`, "i");
  return htmlDecode(re.exec(html)?.[1] ?? swapped.exec(html)?.[1] ?? "").trim() || null;
}

function cleanText(value: string): string {
  return summarize(stripTags(htmlDecode(value)));
}

function cleanUrl(value: string): string {
  try {
    const url = new URL(htmlDecode(value).trim());
    return url.toString();
  } catch {
    return "";
  }
}

function xmlTag(body: string, tag: string): string | null {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i").exec(body);
  return match?.[1] ?? null;
}

function summarize(value: string, max = 110): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

function summarizeTitle(value: string): string {
  return summarize(value.replace(/\s*[-|｜]\s*.*$/, ""), 64);
}

function siteName(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function absolutizeUrl(value: string | null, baseUrl: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, baseUrl);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function dedupeResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = normalizeUrlKey(result.url);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeCandidates(candidates: RecipeSearchCandidate[]): RecipeSearchCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = normalizeUrlKey(candidate.url);
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(candidate.title && candidate.summary);
  });
}

function normalizeUrlKey(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|yclid|igsh)/i.test(key)) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

function htmlDecode(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
