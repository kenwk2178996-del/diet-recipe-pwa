"use client";
import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SettingsClient({ email, profile, aiUsed }: { email: string; profile: any; aiUsed: number }) {
  const sb = getBrowserSupabase();
  const limit = profile?.ai_monthly_limit ?? 100;
  const [g, setG] = useState({
    goal_kcal: profile?.goal_kcal ?? "", goal_protein_g: profile?.goal_protein_g ?? "",
    goal_fat_g: profile?.goal_fat_g ?? "", goal_carb_g: profile?.goal_carb_g ?? "",
  });
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function saveGoals() {
    setBusy(true); setSaved(false);
    const body: any = {};
    for (const k of ["goal_kcal", "goal_protein_g", "goal_fat_g", "goal_carb_g"] as const)
      body[k] = (g as any)[k] === "" ? null : Number((g as any)[k]);
    await fetch("/api/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }
  async function signOut() { await sb.auth.signOut(); window.location.href = "/login"; }

  const field = (key: keyof typeof g, label: string, unit: string) => (
    <label className="text-xs text-ink/60">{label}
      <div className="flex items-center gap-1">
        <Input type="number" value={(g as any)[key]} onChange={(e) => setG({ ...g, [key]: e.target.value })} placeholder="—" />
        <span className="text-ink/40">{unit}</span>
      </div>
    </label>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">設定</h1>

      <Card className="space-y-1 p-4 text-sm">
        <p className="text-ink/60">アカウント</p>
        <p className="font-medium">{profile?.display_name ?? email}</p>
        <p className="text-xs text-ink/50">{email}</p>
      </Card>

      <Card className="space-y-3 p-4">
        <div>
          <p className="text-sm font-semibold">1日の目標</p>
          <p className="text-[11px] text-ink/50">ホームの達成度バーやAIおすすめに使われます。</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {field("goal_kcal", "カロリー", "kcal")}
          {field("goal_protein_g", "タンパク質", "g")}
          {field("goal_fat_g", "脂質", "g")}
          {field("goal_carb_g", "炭水化物", "g")}
        </div>
        <Button className="w-full" disabled={busy} onClick={saveGoals}>{busy ? "保存中…" : saved ? "保存しました ✓" : "目標を保存"}</Button>
      </Card>

      <Card className="p-4 text-sm">
        <p className="text-ink/60">今月のAI解析</p>
        <p className="mt-1 text-2xl font-bold">{aiUsed}<span className="text-sm font-normal text-ink/50"> / {limit} 回</span></p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-mist">
          <div className="h-full bg-sage-dark" style={{ width: `${Math.min(100, (aiUsed / limit) * 100)}%` }} />
        </div>
      </Card>

      <Button variant="outline" className="w-full" onClick={signOut}>ログアウト</Button>
    </div>
  );
}
