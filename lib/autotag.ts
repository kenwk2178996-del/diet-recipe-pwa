// 材料名・手順・調理時間・栄養からタグ(カテゴリ)を自動判別する。
// サーバ(保存時の自動付与)とクライアント(検索の絞り込み)の両方で使う純粋関数。

// 食材カテゴリ(§8) → 表記ゆれ・別名。「鶏胸肉」も「鶏むね肉」に寄せる。
export const FOOD_SYNONYMS: Record<string, string[]> = {
  "鶏むね肉": ["鶏むね", "鶏胸", "鶏ムネ", "むね肉", "ムネ肉", "とりむね", "鳥むね", "鳥胸", "鶏むね肉", "鶏胸肉", "サラダチキン", "チキン"],
  "卵": ["卵", "たまご", "玉子", "タマゴ", "エッグ"],
  "豆腐": ["豆腐", "とうふ", "トウフ", "厚揚げ", "高野豆腐"],
  "オートミール": ["オートミール", "オーツ", "オートミル", "オーバーナイトオーツ"],
  "魚": ["魚", "鮭", "サーモン", "鯖", "さば", "サバ", "鮪", "まぐろ", "マグロ", "鱈", "たら", "鰤", "ぶり", "ブリ", "鰯", "いわし", "ツナ", "白身魚", "青魚", "鯛", "たい", "あじ", "鯵", "えび", "海老"],
  "豚肉": ["豚", "豚肉", "ポーク", "豚ロース", "豚バラ", "豚こま", "豚ひき"],
  "野菜": ["野菜", "キャベツ", "にんじん", "人参", "玉ねぎ", "たまねぎ", "ねぎ", "ほうれん草", "ブロッコリー", "トマト", "ピーマン", "なす", "茄子", "きゅうり", "レタス", "もやし", "大根", "白菜", "小松菜", "ズッキーニ", "アスパラ", "きのこ", "しめじ", "ズッキー二"],
};

// 調理法 → 手順/タイトルに現れるキーワード。
const METHOD_KEYWORDS: Record<string, string[]> = {
  "電子レンジ": ["レンジ", "電子レンジ", "チン"],
  "フライパン": ["フライパン"],
  "炊飯器": ["炊飯器", "炊飯"],
  "オーブン": ["オーブン", "トースター"],
};

interface FlexIngredient { name?: string | null }
interface FlexStep { content?: string | null }
interface FlexNutrition { kcal?: number | null; protein_g?: number | null; fat_g?: number | null; carb_g?: number | null }
export interface DetectInput {
  title?: string | null;
  ingredients?: FlexIngredient[] | null;
  steps?: FlexStep[] | null;
  cook_time_min?: number | null;
  nutrition?: FlexNutrition | FlexNutrition[] | null;
}

function normNutrition(n: DetectInput["nutrition"]): FlexNutrition {
  if (!n) return {};
  return Array.isArray(n) ? (n[0] ?? {}) : n;
}

// 材料名の集合が、あるタグの別名いずれかを含むか。
export function ingredientsMatchFoodTag(tagName: string, ingredientNames: string[]): boolean {
  const syns = FOOD_SYNONYMS[tagName];
  if (!syns) return false;
  const hay = ingredientNames.join(" ");
  return syns.some((s) => hay.includes(s));
}

// レシピから付与すべきタグ名の一覧を判定する。
export function detectTags(input: DetectInput): string[] {
  const tags = new Set<string>();
  const ingredientNames = (input.ingredients ?? []).map((i) => i?.name ?? "").filter(Boolean);
  const titleHay = input.title ?? "";
  const foodHay = [titleHay, ...ingredientNames].join(" ");
  const stepHay = [(input.steps ?? []).map((s) => s?.content ?? "").join(" "), titleHay].join(" ");

  // 食材
  for (const [tag, syns] of Object.entries(FOOD_SYNONYMS)) {
    if (syns.some((s) => foodHay.includes(s))) tags.add(tag);
  }
  // 調理法
  for (const [tag, kws] of Object.entries(METHOD_KEYWORDS)) {
    if (kws.some((k) => stepHay.includes(k))) tags.add(tag);
  }
  // 時間
  const t = input.cook_time_min;
  if (typeof t === "number" && t > 0) {
    if (t <= 15) { tags.add("15分以内"); tags.add("時短"); }
    if (t <= 10) tags.add("10分以内");
    if (t <= 5) tags.add("5分以内");
  }
  // 栄養(1人分)
  const n = normNutrition(input.nutrition);
  if (n.kcal != null && n.kcal <= 300) tags.add("低カロリー");
  if (n.protein_g != null && n.protein_g >= 20) { tags.add("高タンパク"); tags.add("筋トレ向け"); }
  if (n.fat_g != null && n.fat_g <= 5) tags.add("低脂質");
  if (n.carb_g != null && n.carb_g <= 20) tags.add("低糖質");

  return [...tags];
}

// レシピが実質的に持つタグ名(=付与済み ∪ 自動判定)。検索の絞り込みで使う。
export function effectiveTagNames(recipe: any): string[] {
  const attached: string[] = (recipe.recipe_tags ?? [])
    .map((rt: any) => rt?.tags?.name)
    .filter(Boolean);
  const detected = detectTags({
    title: recipe.title,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    cook_time_min: recipe.cook_time_min,
    nutrition: recipe.nutrition,
  });
  return [...new Set([...attached, ...detected])];
}
