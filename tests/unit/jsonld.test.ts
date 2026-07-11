import { describe, it, expect } from "vitest";
import { parseRecipeJsonLd } from "@/lib/ingest/jsonld";

const html = `<html><head>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Recipe","name":"鶏むねチャーシュー",
"recipeIngredient":["鶏むね肉 300g","醤油 大さじ2"],
"recipeInstructions":[{"@type":"HowToStep","text":"下味をつける"},{"@type":"HowToStep","text":"焼く"}],
"totalTime":"PT25M","recipeYield":"2","image":"https://x/y.jpg",
"nutrition":{"@type":"NutritionInformation","calories":"320 kcal","proteinContent":"40 g"}}
</script></head><body></body></html>`;

describe("parseRecipeJsonLd", () => {
  it("extracts recipe from JSON-LD", () => {
    const r = parseRecipeJsonLd(html)!;
    expect(r).not.toBeNull();
    expect(r.title).toBe("鶏むねチャーシュー");
    expect(r.ingredients).toHaveLength(2);
    expect(r.steps).toHaveLength(2);
    expect(r.cook_time_min).toBe(25);
    expect(r.servings).toBe(2);
    expect(r.nutrition.kcal).toBe(320);
    expect(r.nutrition.source).toBe("page");
  });
  it("returns null when no Recipe present", () => {
    expect(parseRecipeJsonLd("<html></html>")).toBeNull();
  });
});
