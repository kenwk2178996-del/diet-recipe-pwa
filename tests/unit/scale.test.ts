import { describe, it, expect } from "vitest";
import { scaleAmount } from "@/lib/utils/scale";
describe("scaleAmount (§11.12)", () => {
  it("halves 2->1 serving", () => expect(scaleAmount(200, 2, 1)).toBe(100));
  it("doubles 1->2", () => expect(scaleAmount(50, 1, 2)).toBe(100));
  it("passes through null amount", () => expect(scaleAmount(null, 2, 1)).toBeNull());
  it("passes through when base missing", () => expect(scaleAmount(100, null, 3)).toBe(100));
});
