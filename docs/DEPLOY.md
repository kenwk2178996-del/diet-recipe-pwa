# デプロイ手順（ハンズオン）

所要 20〜30分。① Supabase → ② Anthropic → ③ GitHub → ④ Vercel → ⑤ 最終設定。

## ① Supabase プロジェクト作成
1. https://supabase.com/dashboard → 「New project」
2. Name（例: diet-recipe）、Database Password（控える）、Region（Tokyo 推奨）→ Create。
3. 作成完了まで1〜2分待つ。

## ② マイグレーション適用
1. 左メニュー「SQL Editor」→「New query」。
2. `supabase/ALL_IN_ONE.sql` の中身を全部貼り付け →「Run」。
3. 「Success」表示を確認（テーブル8個・RLS・トリガー・storageバケットが作成される）。

## ③ APIキー取得（Supabase）
Project Settings → API:
- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- anon public → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- service_role（Reveal）→ `SUPABASE_SERVICE_ROLE_KEY`（サーバ専用・秘密）

## ④ Anthropic APIキー
https://console.anthropic.com → API Keys → Create Key → `ANTHROPIC_API_KEY`。

## ⑤ Google ログイン（任意）
- Supabase → Authentication → Providers → Google を有効化し、Google Cloud の OAuth Client ID/Secret を設定。
- 認可リダイレクト: `https://<PROJECT>.supabase.co/auth/v1/callback`
- 使わない場合はメール+パスワードのみで動作。

## ⑥ GitHub へ push
```bash
git init && git add . && git commit -m "init"
git branch -M main
git remote add origin https://github.com/<you>/diet-recipe-pwa.git
git push -u origin main
```

## ⑦ Vercel デプロイ
1. https://vercel.com/new → GitHub リポジトリを Import。
2. Environment Variables に以下を設定:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - ANTHROPIC_API_KEY
   - ANTHROPIC_MODEL = claude-sonnet-4-5
   - NEXT_PUBLIC_SITE_URL = https://<your-app>.vercel.app（初回デプロイ後の実URLに更新）
   - （任意）YOUTUBE_API_KEY / INSTAGRAM_OEMBED_TOKEN
3. Deploy。

## ⑧ デプロイ後の最終設定
- Supabase → Authentication → URL Configuration:
  - Site URL = 本番URL
  - Redirect URLs に `https://<your-app>.vercel.app/auth/callback` を追加
- `NEXT_PUBLIC_SITE_URL` を本番URLに更新して再デプロイ。
- スマホでアクセス →「ホーム画面に追加」でPWAインストール確認。

## CLIで一気に（任意）
```bash
npm i -g vercel
vercel            # 初回リンク
vercel env add NEXT_PUBLIC_SUPABASE_URL   # ...各変数
vercel --prod
```
