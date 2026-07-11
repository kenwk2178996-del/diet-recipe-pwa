# 設計判断ログ (DECISIONS)

自律判断ルール §2 に基づき、本書に明記されていない仕様について下した判断を記録する。

- AIプロバイダ差し替えは `lib/ai/` の `AiProvider` インターフェース + `getAiProvider()` ファクトリで実装。`AI_PROVIDER` 環境変数で選択。
- Claude の構造化出力は tool-use (`tool_choice: emit_recipe`) を採用。JSONモードより堅牢なため。
- 構造化出力スキーマは spec §7 を JSON Schema 化し、サーバ側で zod により再検証（二重防御）。
- 材料の重複統合キーは `name(小文字) + unit`。両方が数値の場合のみ加算、それ以外は先勝ち。
- 栄養の異常値: kcal>3000/人分で警告（削除はしない）。負値は null 化。
- SSRF: DNS解決後に全解決IPを検査し、リダイレクトは manual で各ホップ再検証。CGNAT(100.64/10)も遮断。
- 画像は sharp で JPEG 再エンコード + 長辺1600px。EXIF/悪意ペイロード除去も兼ねる。
- レート制限は現状インメモリのスライディングウィンドウ（単一インスタンス前提）。複数インスタンスでは要差し替え（KNOWN_LIMITATIONS参照）。
- 認証未済アクセスは middleware で `/login` にリダイレクト。公開パスは login/auth/manifest/sw のみ。
- 新規サインアップ時に DB トリガーで profile 作成 + タグ初期シード（§8）を自動投入。
- 星評価は 0–5 の int（0=未評価）。servings 既定値は 1。
- 検索は SQL で可能な条件（キーワード/お気に入り/評価/時間）を絞り込み、栄養・タグの数値/AND条件はクライアント側で補完（JOIN済みデータを利用）。
- Instagram oEmbed は公式にアプリトークン必須のため、`INSTAGRAM_OEMBED_TOKEN` 未設定時は補完UI誘導にフォールバック。
- iOS は Web Share Target 非対応のため、クリップボードURL自動検出（focus時）でフォールバック。
- 単一ファイル方針ではなく通常の Next.js プロジェクト構成を採用（保守性重視・§2-2）。
