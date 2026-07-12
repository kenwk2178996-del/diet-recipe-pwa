import { describe, expect, it } from "vitest";
import {
  extractFirstHttpUrlFromShare,
  extractInstagramUrlFromShare,
  shareTextMentionsInstagram,
} from "@/lib/ingest/share-target";

describe("share target URL extraction", () => {
  it("extracts and normalizes a shared Instagram URL", () => {
    const result = extractInstagramUrlFromShare({
      url: "https://instagram.com/reel/ABC123/?igsh=xyz&utm_source=ig_web_copy_link",
    });
    expect(result).toMatchObject({
      normalizedUrl: "https://www.instagram.com/reel/ABC123/",
      postId: "ABC123",
    });
  });

  it("extracts Instagram URL from mixed share text", () => {
    const result = extractInstagramUrlFromShare({
      text: "この投稿をチェックしてみてください\nhttps://www.instagram.com/p/POST999/?utm_source=ig_web_copy_link",
    });
    expect(result?.normalizedUrl).toBe("https://www.instagram.com/p/POST999/");
  });

  it("cleans trailing Japanese quote and markdown link punctuation", () => {
    const result = extractInstagramUrlFromShare({
      text: "この投稿をチェックしてみてください\n[https://www.instagram.com/reel/xxxx/」](https://www.instagram.com/reel/xxxx/%E3%80%8D)",
    });
    expect(result?.normalizedUrl).toBe("https://www.instagram.com/reel/xxxx/");
  });

  it("supports feed post and reel URLs", () => {
    expect(extractInstagramUrlFromShare({ text: "https://www.instagram.com/p/feedId/" })?.postId).toBe("feedId");
    expect(extractInstagramUrlFromShare({ text: "https://www.instagram.com/reel/reelId/" })?.postId).toBe("reelId");
  });

  it("detects invalid Instagram share text without treating it as a generic URL", () => {
    const payload = { text: "https://www.instagram.com/stories/user/123/" };
    expect(extractInstagramUrlFromShare(payload)).toBeNull();
    expect(shareTextMentionsInstagram(payload)).toBe(true);
  });

  it("keeps generic URL sharing available for other sites", () => {
    expect(extractFirstHttpUrlFromShare({ text: "見て https://example.com/recipe/1" })).toBe("https://example.com/recipe/1");
  });
});
