# テスト実行結果

## ユニットテスト (Vitest) — 実行済み・全パス ✅
ビルドマシン上で実際に実行し、19件すべてパスを確認。

```
✓ tests/unit/detect.test.ts    (5) — URL種別判定 §6
✓ tests/unit/ssrf.test.ts      (3) — SSRF拒否/許可 §9
✓ tests/unit/jsonld.test.ts    (2) — schema.org/Recipe 抽出 §6
✓ tests/unit/validate.test.ts  (5) — 数値検証/重複統合/kcal警告/手順再採番 §4
✓ tests/unit/scale.test.ts     (4) — 人数換算 §11.12
Test Files  5 passed (5)
      Tests  19 passed (19)
```

対象は最もリスクの高い純粋ロジック（SSRF、URL判定、JSON-LDパース、AI出力の検証・正規化、分量換算）。
実行コマンド: `npm run test:unit`

## 型チェック (tsc) — 実行済み・エラー0 ✅
`npm run typecheck` を実行し、型エラー0（exit 0）を確認。

## 本番ビルド (next build) — 成功 ✅
`next build` が成功。全15ルート + middleware をコンパイル。
```
✓ Compiled successfully
✓ Generating static pages (14/14)
Route (app): / /add /login /search /settings /recipes/[id] /recipes/[id]/edit
             /auth/callback /share-target /api/{ingest,ai/structure,recipes,recipes/[id],tags}
ƒ Middleware  82.6 kB
```
警告1件: `@supabase/supabase-js` が Edge Runtime で `process.version` を参照（middleware）。
既知の無害な警告で、ビルド・動作に影響なし。

## E2E (Playwright) — 資格情報依存
- `tests/e2e/auth.spec.ts`（未認証リダイレクト + ログインUI）は資格情報不要で dev サーバ起動後に通る。
- §11 の 2〜17（RLS分離・取り込み・CRUD・検索・上限）は Supabase/Anthropic の資格情報が必要（`authenticated.spec.ts.template` 同梱）。

## §11 受入テストの実装対応表
| # | 項目 | 実装/テスト |
|---|---|---|
| 1 | 登録/ログイン/再設定/ログアウト | `app/login`, `settings`, e2e `auth.spec.ts` |
| 2 | RLS分離 | `0002_rls.sql`, e2e template |
| 3 | レシピサイトURL→JSON-LD | `lib/ingest/jsonld.ts`, unit `jsonld.test.ts` |
| 4 | ブログURL→AI抽出 | `lib/ingest/index.ts` + `api/ai/structure` |
| 5 | IG/TikTok→oEmbed+補完UI | `lib/ingest/oembed.ts`, `add-client` |
| 6 | YouTube→説明文 | `oembed.ts` fetchYoutubeDescription |
| 7 | 無効/非公開→URLのみ保存 | `ingest` unfetchable 分岐 |
| 8 | スクショ2枚統合 | `api/ai/structure`(複数画像) |
| 9 | テキスト貼付→レシピ化 | `add` text タブ |
| 10 | 確認画面編集/並び替え | `recipe-form.tsx` moveStep |
| 11 | 一覧/詳細/編集/削除/複製 | `recipes/*`, detail duplicate |
| 12 | 人数換算 | `lib/utils/scale.ts`, unit `scale.test.ts` |
| 13 | 複合検索 | `search-client.tsx`, `api/recipes` |
| 14 | お気に入り/星/メモ/作った | `detail-client.tsx` |
| 15 | AI月間上限→手動誘導 | `api/ai/structure` 402 分岐 |
| 16 | PWAインストール | `manifest.webmanifest`, `sw.js` |
| 17 | 共有受け取り/iOSクリップボード | `share-target`, `clipboard-watcher` |
| 18 | 375/768/1280 レスポンシブ | mobile-first Tailwind, playwright projects |
