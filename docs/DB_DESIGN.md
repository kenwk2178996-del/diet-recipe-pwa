# DB設計書

全テーブル RLS 有効。原則 `user_id = auth.uid()` のみ read/write 可。子テーブルは親 `recipes` の所有者チェックで制御。

| テーブル | 主なカラム | 説明 |
|---|---|---|
| users_profile | id(=auth.users), display_name, ai_monthly_limit(既定100), created_at | プロフィールとAI上限 |
| recipes | id, user_id, title, description, main_image_url, cook_time_min, servings, source_url/site/sns/author, is_favorite, rating(0-5), memo, cooked_count, last_cooked_at, status(draft/published), created_at, updated_at | レシピ本体 |
| ingredients | id, recipe_id, name, amount(numeric), unit, note, group_name, sort_order | 材料 |
| steps | id, recipe_id, step_no, content, heat_time_min, temperature, note | 手順 |
| nutrition | recipe_id(PK), kcal, protein_g, fat_g, carb_g, fiber_g, sugar_g, salt_g, source(page/calculated/ai_estimated/user_input) | 栄養(1:1) |
| tags | id, user_id, name, category | ユーザー別タグ |
| recipe_tags | recipe_id, tag_id | 多対多 |
| ai_logs | id, user_id, type, input_kind, tokens_in, tokens_out, success, error, created_at | AI利用ログ/上限計算元 |

## 関数 / トリガー
- `set_updated_at()`: recipes 更新時に updated_at 自動更新。
- `ai_calls_this_month(uid)`: 当月の成功AI呼び出し回数（上限判定に使用）。
- `handle_new_user()`: サインアップ時に profile 作成 + タグ初期シード（§8, 28件）。

## マイグレーション
`supabase/migrations/` を番号順に適用。
1. 0001_schema.sql — テーブル/enum/index/関数
2. 0002_rls.sql — RLSポリシー
3. 0003_profile_trigger.sql — サインアップ時トリガー
4. 0004_storage.sql — recipe-images バケット + パス所有者ポリシー

## 将来拡張の非阻害設計（§12）
- meal_plans（献立カレンダー）、shopping_lists（買い物リスト）は recipes を参照する新テーブルとして追加可能。列削除禁止方針により後方互換を維持。
