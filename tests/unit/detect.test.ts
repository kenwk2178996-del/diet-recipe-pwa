import { describe, it, expect } from "vitest";
import { detectUrlKind } from "@/lib/ingest/detect";

describe("detectUrlKind", () => {
  it("instagram post/reel", () => {
    expect(detectUrlKind("https://www.instagram.com/p/ABC/")).toBe("instagram");
    expect(detectUrlKind("https://instagram.com/reel/XYZ/")).toBe("instagram");
  });
  it("tiktok", () => expect(detectUrlKind("https://www.tiktok.com/@u/video/123")).toBe("tiktok"));
  it("youtube long + short", () => {
    expect(detectUrlKind("https://www.youtube.com/watch?v=abc")).toBe("youtube");
    expect(detectUrlKind("https://youtu.be/abc")).toBe("youtube");
  });
  it("general", () => expect(detectUrlKind("https://cookpad.com/recipe/1")).toBe("general"));
  it("invalid -> general", () => expect(detectUrlKind("not a url")).toBe("general"));
});
