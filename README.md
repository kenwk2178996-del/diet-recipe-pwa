# ダイエットレシピ管理 PWA

SNS・WebサイトのレシピをURL・スクリーンショット・テキストから取り込み、AIで構造化して保存・検索できるPWA。

**中核体験**: URLを共有/貼り付け → AIが材料・作り方・カロリー・PFCに整理 → 確認して保存 → タグ・キーワードで検索。

## 技術スタック
- Next.js 14 (App Router, TypeScript) / Tailwind CSS
- Supabase (PostgreSQL + RLS / Auth / Storage)
- Anthropic Claude API（tool-useによる構造化出力、`lib/ai/` で抽象化・差し替え可能）
- Vercel ホスティング / PWA (manifest + Service Worker)

## セットアップ

### 1. 依存関係
```bash
npm install
```

### 2. Supabase
1. https://supabase.com でプロジェクト作成。
2. Settings → API から URL / anon key / service_role key を取得。
3. マイグレーション適用（どちらか）:
   - Supabase CLI: `supabase link --project-ref <ref> && supabase db push`
   - もしくは SQL Editor に `supabase/migrations/*.sql` を番号順に貼り付けて実行。
4. Authentication → Providers で Email を有効化、Google を使う場合は OAuth 情報を設定。
   Redirect URL に `<SITE_URL>/auth/callback` を追加。

### 3. 環境変数
`.env.example` を `.env` にコピーして各値を設定。
```bash
cp .env.example .env
```
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`（サーバ専用・クライアントに露出させない）
- `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`（既定 `claude-sonnet-4-5`）
- 任意: `YOUTUBE_API_KEY`（説明文/字幕の取得精度向上）、`INSTAGRAM_OEMBED_TOKEN`

### 4. 開発起動
```bash
npm run dev        # http://localhost:3000
```

## テスト
```bash
npm run typecheck  # 型チェック
npm run test:unit  # Vitest ユニット（URL判定/SSRF/JSON-LD/検証/換算）
npm run test:e2e   # Playwright（未認証UIは資格情報不要で通る）
npm test           # 上記まとめて
```
認証必須のE2E（RLS分離, 取り込み, CRUD, 検索, 上限）は Supabase/Anthropic の資格情報が必要。
`tests/e2e/authenticated.spec.ts.template` を参照。

## デプロイ (Vercel)
1. リポジトリを GitHub に push。
2. Vercel で Import Project。
3. Environment Variables に `.env` と同じ値を設定（`NEXT_PUBLIC_SITE_URL` は本番URL）。
4. Deploy。ビルドコマンド `next build` は既定で認識される。
5. Supabase の Auth Redirect URL に本番の `/auth/callback` を追加。

## ドキュメント (`docs/`)
- `DB_DESIGN.md` — スキーマ / RLS / トリガー / マイグレーション
- `SCREENS.md` — 画面一覧
- `DECISIONS.md` — 自律判断ログ
- `KNOWN_LIMITATIONS.md` — 既知の制限
- `TEST_RESULTS.md` — テスト実行結果
- `ROADMAP.md` — 拡張候補

## セキュリティ要点（§9）
- AI・外部フェッチは全てサーバ側でAPIキー非露出。
- SSRF対策: DNS解決IP検査 + リダイレクト各ホップ再検証 + http/https限定。
- 画像は形式/サイズ検査 + sharp 再エンコード（長辺1600px）。
- URL解析・AI解析エンドポイントにユーザー別レート制限。
- 取得HTML/投稿文はサニタイズして表示。
