import { describe, expect, it } from "vitest";
import { getSavedListCategory, groupSavedListRecipes } from "@/lib/recipe-categories";

describe("saved recipe list categories", () => {
  it("detects meat recipes from ingredients", () => {
    expect(getSavedListCategory({
      title: "高たんぱくおかず",
      ingredients: [{ name: "鶏むね肉" }],
    })).toBe("meat");
  });

  it("detects fish recipes from title and ingredients", () => {
    expect(getSavedListCategory({
      title: "鮭のホイル焼き",
      ingredients: [{ name: "しめじ" }],
    })).toBe("fish");
  });

  it("prioritizes staple recipes when the title says rice or noodles", () => {
    expect(getSavedListCategory({
      title: "鶏そぼろ丼",
      ingredients: [{ name: "鶏ひき肉" }, { name: "ご飯" }],
    })).toBe("staple");
  });

  it("detects side dishes from vegetable and small-dish words", () => {
    expect(getSavedListCategory({
      title: "小松菜のナムル",
      ingredients: [{ name: "小松菜" }],
    })).toBe("side");
  });

  it("keeps unmatched recipes visible as other", () => {
    expect(getSavedListCategory({
      title: "プロテインスムージー",
      ingredients: [{ name: "プロテイン" }],
    })).toBe("other");
  });

  it("groups recipes in saved-list display order", () => {
    const groups = groupSavedListRecipes([
      { id: "1", title: "鶏むね焼き", ingredients: [{ name: "鶏むね肉" }] },
      { id: "2", title: "鮭ごはん", ingredients: [{ name: "鮭" }, { name: "ご飯" }] },
      { id: "3", title: "きゅうりの浅漬け", ingredients: [{ name: "きゅうり" }] },
    ]);

    expect(groups.map((group) => group.id)).toEqual(["meat", "fish", "side", "staple", "other"]);
    expect(groups.find((group) => group.id === "meat")?.recipes).toHaveLength(1);
    expect(groups.find((group) => group.id === "staple")?.recipes).toHaveLength(1);
    expect(groups.find((group) => group.id === "side")?.recipes).toHaveLength(1);
  });
});
