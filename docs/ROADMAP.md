# 拡張候補 (ROADMAP)

今回未実装。現行スキーマ/構成は以下を阻害しない設計（§12）。
- 献立カレンダー: `meal_plans(user_id, date, recipe_id, meal_type)` を追加。
- 買い物リスト: 材料合算 + 単位正規化。`unit` 正規化テーブルの導入。
- AIチャット: 残りPFCから献立提案（`ai_logs` を会話ログにも拡張可能）。
- 食品成分表DB連携: `nutrition.source=calculated` を活かし精度向上。
- 体重・食事記録 + ホームの目標カロリー表示。
- レート制限の分散化（Upstash Redis）。
- Instagram/TikTok の本文取得強化（各種公式API/権限取得後）。
