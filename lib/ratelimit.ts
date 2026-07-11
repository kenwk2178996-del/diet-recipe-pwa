// Simple per-user in-memory sliding window (spec §9). For multi-instance
// production, swap for a Supabase/Upstash-backed store — see KNOWN_LIMITATIONS.
const hits = new Map<string, number[]>();
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) { hits.set(key, arr); return false; }
  arr.push(now); hits.set(key, arr);
  return true;
}
