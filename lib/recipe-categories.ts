import { effectiveTagNames } from "@/lib/autotag";

export type SavedListCategoryId = "meat" | "fish" | "side" | "staple" | "other";

export interface SavedListCategory {
  id: SavedListCategoryId;
  label: string;
}

export const SAVED_LIST_CATEGORIES: SavedListCategory[] = [
  { id: "meat", label: "肉系" },
  { id: "fish", label: "魚系" },
  { id: "side", label: "副菜系" },
  { id: "staple", label: "主食" },
  { id: "other", label: "その他" },
];

const STAPLE_TERMS = [
  "主食", "ご飯", "ごはん", "米", "玄米", "雑穀", "もち", "餅", "丼", "どんぶり",
  "麺", "パスタ", "スパゲッティ", "うどん", "そば", "蕎麦", "ラーメン", "焼きそば",
  "パン", "トースト", "サンド", "オートミール", "チャーハン", "リゾット",
];

const FISH_TERMS = [
  "魚", "鮭", "さけ", "サケ", "サーモン", "鯖", "さば", "サバ", "鮪", "まぐろ",
  "マグロ", "鱈", "たら", "鰤", "ぶり", "ブリ", "鰯", "いわし", "ツナ", "白身魚",
  "青魚", "鯛", "たい", "あじ", "鯵", "えび", "海老", " shrimp", "いか", "イカ",
  "たこ", "タコ", "シーフード",
];

const MEAT_TERMS = [
  "肉", "鶏", "鳥", "チキン", "むね肉", "胸肉", "もも肉", "ささみ", "豚", "ポーク",
  "豚肉", "豚こま", "豚バラ", "豚ひき", "牛", "ビーフ", "牛肉", "ひき肉", "挽き肉",
  "合いびき", "ハム", "ベーコン", "ソーセージ", "ウインナー",
];

const SIDE_TERMS = [
  "副菜", "小鉢", "サラダ", "和え", "あえ", "ナムル", "きんぴら", "おひたし",
  "漬け", "浅漬け", "マリネ", "野菜", "キャベツ", "にんじん", "人参", "玉ねぎ",
  "たまねぎ", "ねぎ", "ほうれん草", "ブロッコリー", "トマト", "ピーマン", "なす",
  "茄子", "きゅうり", "レタス", "もやし", "大根", "白菜", "小松菜", "ズッキーニ",
  "アスパラ", "きのこ", "しめじ", "豆腐", "厚揚げ", "卵", "たまご", "わかめ",
  "ひじき", "枝豆",
];

interface RecipeLike {
  title?: string | null;
  description?: string | null;
  source_author?: string | null;
  ingredients?: Array<{ name?: string | null }> | null;
  recipe_tags?: any;
  steps?: any;
  cook_time_min?: number | null;
  nutrition?: any;
}

function includesAny(haystack: string, terms: string[]) {
  return terms.some((term) => haystack.includes(term.toLowerCase()));
}

function searchableText(recipe: RecipeLike, effectiveTags: string[]) {
  const ingredientText = (recipe.ingredients ?? [])
    .map((ingredient) => ingredient?.name ?? "")
    .filter(Boolean)
    .join(" ");

  return [
    recipe.title,
    recipe.description,
    recipe.source_author,
    ingredientText,
    effectiveTags.join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function getSavedListCategory(recipe: RecipeLike): SavedListCategoryId {
  const effectiveTags = effectiveTagNames(recipe);
  const text = searchableText(recipe, effectiveTags);
  const titleAndTags = [recipe.title, effectiveTags.join(" ")].filter(Boolean).join(" ").toLowerCase();

  if (includesAny(titleAndTags, STAPLE_TERMS)) return "staple";
  if (includesAny(text, FISH_TERMS)) return "fish";
  if (includesAny(text, MEAT_TERMS)) return "meat";
  if (includesAny(text, STAPLE_TERMS)) return "staple";
  if (includesAny(text, SIDE_TERMS)) return "side";
  return "other";
}

export function groupSavedListRecipes<T extends RecipeLike>(recipes: T[]) {
  return SAVED_LIST_CATEGORIES.map((category) => ({
    ...category,
    recipes: recipes.filter((recipe) => getSavedListCategory(recipe) === category.id),
  }));
}
