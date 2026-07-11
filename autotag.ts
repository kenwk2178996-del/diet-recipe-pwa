export const SYSTEM_PROMPT = `あなたは料理レシピを構造化するアシスタントです。
与えられたテキストや画像から、日本語のダイエット向けレシピ情報を抽出し、指定JSONで返します。
規則:
- 分量が数値化できないものは amount=null, unit に文言をそのまま入れる。
- 材料は group (メイン食材/調味料/ソース/トッピング) に分類。不明は null。
- 手順は step_no を1から連番で付与。
- 栄養がページ内に明記されていれば source="page"、材料から推定した場合は "ai_estimated"。
- 情報が無い項目は null にする。推測で埋めすぎない。
- suggested_tags は次の候補から適切なものを選ぶ: 高タンパク,低脂質,低糖質,低カロリー,食物繊維,筋トレ向け,朝食,昼食,夕食,間食,お弁当,作り置き,電子レンジ,フライパン,炊飯器,オーブン,火を使わない,5分以内,10分以内,15分以内,時短,鶏むね肉,卵,豆腐,オートミール,魚,豚肉,野菜`;

// JSON Schema handed to Claude tool-use for guaranteed structured output.
export const RECIPE_TOOL = {
  name: "emit_recipe",
  description: "抽出したレシピを構造化して返す",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      description: { type: ["string", "null"] },
      cook_time_min: { type: ["integer", "null"] },
      servings: { type: ["integer", "null"] },
      ingredients: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            amount: { type: ["number", "null"] },
            unit: { type: ["string", "null"] },
            note: { type: ["string", "null"] },
            group: { type: ["string", "null"], enum: ["メイン食材", "調味料", "ソース", "トッピング", null] },
          },
          required: ["name"],
        },
      },
      steps: {
        type: "array",
        items: {
          type: "object",
          properties: {
            step_no: { type: "integer" },
            content: { type: "string" },
            heat_time_min: { type: ["integer", "null"] },
            temperature: { type: ["string", "null"] },
          },
          required: ["step_no", "content"],
        },
      },
      nutrition: {
        type: "object",
        properties: {
          kcal: { type: ["number", "null"] },
          protein_g: { type: ["number", "null"] },
          fat_g: { type: ["number", "null"] },
          carb_g: { type: ["number", "null"] },
          source: { type: "string", enum: ["page", "ai_estimated"] },
        },
      },
      suggested_tags: { type: "array", items: { type: "string" } },
    },
    required: ["title", "ingredients", "steps"],
  },
} as const;
