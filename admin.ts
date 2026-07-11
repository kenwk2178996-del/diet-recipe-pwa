import dns from "node:dns/promises";
import net from "node:net";

// Reject private / loopback / link-local / metadata targets (spec §9).
function isForbiddenIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 10) return true;
    if (a === 127) return true;                 // loopback
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;    // link-local + 169.254.169.254 metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  if (net.isIPv6(ip)) {
    const s = ip.toLowerCase();
    if (s === "::1" || s === "::") return true;
    if (s.startsWith("fc") || s.startsWith("fd")) return true; // unique local
    if (s.startsWith("fe80")) return true;                     // link-local
    if (s.startsWith("::ffff:")) return isForbiddenIp(s.replace("::ffff:", ""));
    return false;
  }
  return true;
}

export async function assertSafeUrl(raw: string): Promise<URL> {
  let u: URL;
  try { u = new URL(raw); } catch { throw new Error("URLの形式が正しくありません"); }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("http/https以外は許可されません");
  const host = u.hostname;
  if (net.isIP(host)) {
    if (isForbiddenIp(host)) throw new Error("プライベート/内部アドレスへのアクセスは拒否されました");
    return u;
  }
  const records = await dns.lookup(host, { all: true }).catch(() => []);
  if (records.length === 0) throw new Error("ホスト名を解決できませんでした");
  for (const r of records) if (isForbiddenIp(r.address)) throw new Error("内部アドレスに解決されるため拒否されました");
  return u;
}

// Fetch with manual redirect handling so each hop is re-validated (spec §9).
export async function safeFetch(raw: string, opts: { maxRedirects?: number } = {}): Promise<Response> {
  const maxRedirects = opts.maxRedirects ?? 4;
  let current = raw;
  for (let i = 0; i <= maxRedirects; i++) {
    const u = await assertSafeUrl(current);
    const res = await fetch(u.toString(), {
      redirect: "manual",
      headers: { "user-agent": "DietRecipeBot/1.0 (+recipe importer)", accept: "text/html,application/json" },
      signal: AbortSignal.timeout(12000),
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location")!, u).toString();
      continue;
    }
    return res;
  }
  throw new Error("リダイレクトが多すぎます");
}
