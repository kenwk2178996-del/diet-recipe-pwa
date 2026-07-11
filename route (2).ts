// Servings converter (spec §11.12). Scales numeric amounts by target/base.
export function scaleAmount(amount: number | null, base: number | null, target: number): number | null {
  if (amount == null || !base || base <= 0 || target <= 0) return amount;
  const v = (amount * target) / base;
  return Math.round(v * 100) / 100;
}
