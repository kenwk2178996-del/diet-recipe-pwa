"use client";
import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HomeSuggest({ remainingKcal, remainingProtein }: { remainingKcal: number | null; remainingProtein: number | null }) {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ recipeId: string; title: string; reason: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function go() {
    setBusy(true); setMsg(null); setRes(null);
    try {
      const r = await fetch("/api/suggest", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ remainingKcal, remainingProtein }),
      });
      const j = await r.json();
      if (j.empty) { setMsg("まずレシピを保存すると提案できます。"); return; }
      if (j.error) { setMsg(j.error); return; }
      setRes(j);
    } catch { setMsg("提案の取得に失敗しました。"); } finally { setBusy(false); }
  }

  return (
    <div className="rounded-2xl border border-beige bg-gradient-to-br from-sage/30 to-ivory p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold"><Sparkles size={16} className="text-sage-dark" />AI 今日のおすすめ</h2>
        <Button variant="ghost" className="text-xs" disabled={busy} onClick={go}>{busy ? "考え中…" : res ? "もう一度" : "提案してもらう"}</Button>
      </div>
      {res && (
        <Link href={`/recipes/${res.recipeId}`} className="mt-2 block rounded-xl bg-white p-3">
          <p className="text-sm font-semibold text-sage-dark">{res.title}</p>
          <p className="mt-0.5 text-xs text-ink/70">{res.reason}</p>
        </Link>
      )}
      {msg && <p className="mt-2 text-xs text-ink/50">{msg}</p>}
      {!res && !msg && !busy && <p className="mt-2 text-xs text-ink/50">残りの栄養に合う一品をAIが選びます。</p>}
    </div>
  );
}
