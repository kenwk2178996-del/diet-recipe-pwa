import { describe, it, expect } from "vitest";
import { assertSafeUrl } from "@/lib/ingest/ssrf";

describe("assertSafeUrl (SSRF §9)", () => {
  it("rejects non-http protocols", async () => {
    await expect(assertSafeUrl("file:///etc/passwd")).rejects.toThrow();
    await expect(assertSafeUrl("ftp://example.com")).rejects.toThrow();
  });
  it("rejects loopback + private + metadata IPs", async () => {
    await expect(assertSafeUrl("http://127.0.0.1/")).rejects.toThrow();
    await expect(assertSafeUrl("http://10.0.0.5/")).rejects.toThrow();
    await expect(assertSafeUrl("http://192.168.1.1/")).rejects.toThrow();
    await expect(assertSafeUrl("http://169.254.169.254/latest/meta-data/")).rejects.toThrow();
    await expect(assertSafeUrl("http://172.16.0.1/")).rejects.toThrow();
  });
  it("allows a public IP literal (no DNS needed)", async () => {
    const u = await assertSafeUrl("https://8.8.8.8/");
    expect(u.hostname).toBe("8.8.8.8");
  });
});
