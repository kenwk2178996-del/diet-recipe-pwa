"use client";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function SettingsClient({ email, profile, aiUsed }: { email: string; profile: any; aiUsed: number }) {
  const sb = getBrowserSupabase();
  const limit = profile?.ai_monthly_limit ?? 100;
  async function signOut() { await sb.auth.signOut(); window.location.href = "/login"; }
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">設定</h1>
      <Card className="space-y-1 p-4 text-sm">
        <p className="text-ink/60">アカウント</p>
        <p className="font-medium">{profile?.display_name ?? email}</p>
        <p className="text-xs text-ink/50">{email}</p>
      </Card>
      <Card className="p-4 text-sm">
        <p className="text-ink/60">今月のAI解析</p>
        <p className="mt-1 text-2xl font-bold">{aiUsed}<span className="text-sm font-normal text-ink/50"> / {limit} 回</span></p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-mist">
          <div className="h-full bg-sage-dark" style={{ width: `${Math.min(100, (aiUsed / limit) * 100)}%` }} />
        </div>
        {aiUsed >= limit && <p className="mt-2 text-xs text-red-600">上限に達しています。手動入力をご利用ください。</p>}
      </Card>
      <Button variant="outline" className="w-full" onClick={signOut}>ログアウト</Button>
    </div>
  );
}
