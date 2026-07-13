import { describe, expect, it } from "vitest";
import {
  buildRecipeSearchQuery,
  parseBingRssRecipeResults,
  parseDuckDuckGoRecipeResults,
  unwrapDuckDuckGoUrl,
} from "@/lib/discover/recipe-search";

describe("recipe discovery search helpers", () => {
  it("adds a recipe hint when the user only enters ingredients", () => {
    expect(buildRecipeSearchQuery("鶏むね 高タンパク 10分")).toBe("鶏むね 高タンパク 10分 レシピ");
    expect(buildRecipeSearchQuery("鮭 レシピ")).toBe("鮭 レシピ");
  });

  it("unwraps DuckDuckGo redirect URLs", () => {
    const wrapped = "https://duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Frecipe%2F1%3Futm_source%3Dx";
    expect(unwrapDuckDuckGoUrl(wrapped)).toBe("https://example.com/recipe/1?utm_source=x");
  });

  it("parses result title, url, and snippet", () => {
    const html = `
      <div class="result results_links">
        <div class="result__body">
          <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Frecipe%2F1">
            鶏むね肉の照り焼き レシピ
          </a>
          <a class="result__snippet">材料は鶏むね肉、醤油、みりん。10分で作れる高タンパク料理です。</a>
        </div>
      </div>`;

    expect(parseDuckDuckGoRecipeResults(html)).toEqual([
      {
        title: "鶏むね肉の照り焼き レシピ",
        url: "https://example.com/recipe/1",
        snippet: "材料は鶏むね肉、醤油、みりん。10分で作れる高タンパク料理です。",
      },
    ]);
  });

  it("parses Bing RSS results", () => {
    const xml = `<?xml version="1.0" encoding="utf-8" ?>
      <rss><channel>
        <item>
          <title>鮭のちゃんちゃん焼き レシピ</title>
          <link>https://example.com/salmon</link>
          <description>材料は鮭、キャベツ、味噌。フライパンで作れる主菜です。</description>
        </item>
      </channel></rss>`;

    expect(parseBingRssRecipeResults(xml)).toEqual([
      {
        title: "鮭のちゃんちゃん焼き レシピ",
        url: "https://example.com/salmon",
        snippet: "材料は鮭、キャベツ、味噌。フライパンで作れる主菜です。",
      },
    ]);
  });
});
