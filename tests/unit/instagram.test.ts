import { describe, expect, it } from "vitest";
import {
  buildInstagramExtractedText,
  classifyInstagramOEmbedError,
  hasRecipeSignals,
  normalizeInstagramUrl,
} from "@/lib/ingest/instagram";

describe("instagram ingest helpers", () => {
  it("normalizes supported Instagram URLs and drops tracking params", () => {
    expect(normalizeInstagramUrl("https://www.instagram.com/p/ABC123/?igsh=abc&utm_source=copy_link")).toMatchObject({
      normalizedUrl: "https://www.instagram.com/p/ABC123/",
      postId: "ABC123",
      mediaType: "p",
    });
    expect(normalizeInstagramUrl("https://instagram.com/reel/XYZ789/?utm_source=ig_web_copy_link")).toMatchObject({
      normalizedUrl: "https://www.instagram.com/reel/XYZ789/",
      postId: "XYZ789",
      mediaType: "reel",
    });
    expect(normalizeInstagramUrl("https://www.instagram.com/tv/TV555/")).toMatchObject({
      normalizedUrl: "https://www.instagram.com/tv/TV555/",
      postId: "TV555",
      mediaType: "tv",
    });
  });

  it("rejects unsupported Instagram paths", () => {
    expect(normalizeInstagramUrl("https://www.instagram.com/stories/user/1/")).toBeNull();
    expect(normalizeInstagramUrl("https://example.com/p/ABC/")).toBeNull();
  });

  it("classifies oEmbed failures for user-facing fallback", () => {
    expect(classifyInstagramOEmbedError(403, "not public")).toBe("private_post");
    expect(classifyInstagramOEmbedError(404, "does not exist")).toBe("deleted_post");
    expect(classifyInstagramOEmbedError(401, "login required")).toBe("login_required");
    expect(classifyInstagramOEmbedError(500, "oops")).toBe("temporary_instagram_error");
  });

  it("detects whether the extracted text contains recipe signals", () => {
    expect(hasRecipeSignals("材料: 鶏むね肉 300g、醤油 大さじ1、片栗粉 小さじ2。作り方: 調味料を混ぜて10分置き、フライパンで焼く。")).toBe(true);
    expect(hasRecipeSignals("A post shared by someone on Instagram")).toBe(false);
  });

  it("builds AI text from oEmbed metadata", () => {
    const info = normalizeInstagramUrl("https://instagram.com/p/ABC/")!;
    const text = buildInstagramExtractedText(info, {
      title: "材料: 卵2個 作り方: 焼く",
      author_name: "recipe_user",
      html: "<blockquote>View this post on Instagram</blockquote>",
      media_id: "179000",
    });
    expect(text).toContain("https://www.instagram.com/p/ABC/");
    expect(text).toContain("recipe_user");
    expect(text).toContain("材料");
  });
});
