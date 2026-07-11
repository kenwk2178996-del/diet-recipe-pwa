import sharp from "sharp";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_BYTES = 10 * 1024 * 1024;

// Re-encode + resize to strip metadata/exploits, long edge 1600px (spec §9).
export async function normalizeImage(buf: Buffer, mime: string): Promise<{ jpeg: Buffer; base64: string }> {
  if (!ALLOWED.includes(mime)) throw new Error("対応形式は jpeg/png/webp/heic のみです");
  if (buf.byteLength > MAX_BYTES) throw new Error("画像は10MBまでです");
  const out = await sharp(buf)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  return { jpeg: out, base64: out.toString("base64") };
}
