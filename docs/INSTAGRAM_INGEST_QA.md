# Instagram取り込み 動作確認

## 事前準備

- Supabase SQL Editorで `supabase/0006_APPLY.sql` を実行する。
- Vercel環境変数は基本不要。Meta oEmbedの仕様変更に備える場合は `INSTAGRAM_OEMBED_TOKEN` または `META_OEMBED_TOKEN` を設定できる。
- PWAの場合はデプロイ後にアプリを再読み込みする。

## 確認ケース

| ケース | 入力 | 期待結果 |
| --- | --- | --- |
| 公開フィード投稿 | `https://www.instagram.com/p/...` | URLが `https://www.instagram.com/p/{id}/` に正規化される。oEmbed結果を使ってAI解析へ進む。 |
| 公開リール | `https://instagram.com/reel/...?...` | `igsh` や `utm_source` が保存URLから除去される。 |
| カルーセル投稿 | `https://www.instagram.com/p/...` | oEmbedで取れる基本情報を表示し、本文不足なら追加入力画面へ進む。 |
| 投稿文に材料がある投稿 | URLのみ | 材料・手順の信号があれば確認画面へ進み、AI推定項目が警告/保存メタに残る。 |
| 動画内にのみ材料がある投稿 | URL + 動画 | 動画から静止画を切り出し、元URLとまとめてAI解析する。 |
| 非公開投稿 | 非公開URL | 「非公開投稿」と表示し、投稿文/画像/動画/手動入力へ誘導する。 |
| 削除済み投稿 | 削除済みURL | 「削除済み投稿」と表示し、手動入力や追加素材へ誘導する。 |
| 同一URLの再登録 | 同じURLを2回入力 | 既存レシピを開く/更新する/別レシピとして保存する、の選択が出る。 |
| スクリーンショットを追加した再解析 | URL + 複数スクショ | 複数画像から材料・分量・作り方・時間・栄養を読み取り、保存前の確認画面へ進む。 |

## 保存メタ情報

保存後、`recipes` に以下が入る。

- `original_source_url`
- `normalized_source_url`
- `instagram_post_id`
- `source_author`
- `import_method`
- `source_fetched_at`
- `ai_estimated_fields`
- `analysis_confidence`
- `source_raw_text`
