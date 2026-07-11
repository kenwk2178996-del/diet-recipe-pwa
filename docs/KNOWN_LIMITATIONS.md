# 既知の制限 (KNOWN LIMITATIONS)

本アプリはこの環境で「コード・スキーマ・テスト・ドキュメント」まで完成しているが、
以下は **ユーザー固有の資格情報 / 外部環境が必要** なため、この場では実行・検証できていない（spec §2-4, §2-5）。

## 実行にユーザー資格情報が必要（コードは完成済み）
- **Supabase プロジェクト**: URL / anon key / service role key（`.env` に設定）。マイグレーション適用で全機能が動く。
- **Anthropic APIキー**: `ANTHROPIC_API_KEY`。未設定でも手動入力・URL(JSON-LD)取り込みは動作、AI整理のみ無効。
- **Vercel アカウント**: デプロイに必要。手順は README「デプロイ」参照。

## 検証状況
- **型チェック(tsc) と `next build` はビルドマシンで実行し成功済み**（TEST_RESULTS.md）。ユニットテスト19件も全パス。

## 認証必須のE2E（§11 の 2〜17）
- RLS分離・URL/AI取り込み・CRUD・検索・月間上限などの受入テストは、シードされた Supabase と Anthropic キーを要する。
- `tests/e2e/authenticated.spec.ts.template` として全網羅の雛形を同梱。`TEST_EMAIL`/`TEST_PASSWORD` を設定しコピーすれば実行可能。
- 資格情報不要な `auth.spec.ts`（未認証リダイレクト + ログインUI, §11.1相当の一部）はそのまま通る。

## 実装上の割り切り
- **レート制限**がインメモリのため、Vercelの複数インスタンス/サーバレスでは厳密に共有されない。本番は Upstash Redis か Supabase テーブルへ移行推奨。
- **Instagram oEmbed** は Facebook アプリトークン必須。未設定時はメタデータのみ→補完UIへ誘導。
- **YouTube 字幕**は Data API キー無しでは取得不可（説明文のみ）。spec §3 のフォールバック通り。
- **Web Share Target の画像**は Android のみ。route で URL/テキストを `/add` に転送するが、共有画像のクライアント受け渡しは簡略実装（TODOコメントあり）。
- **オフライン**は App Shell のみキャッシュ。データはネットワーク優先（API はキャッシュ対象外）。
- HTMLサニタイズは依存を増やさない軽量実装。信頼できない大規模HTMLを描画する用途が増える場合は DOMPurify 等の採用を推奨。
