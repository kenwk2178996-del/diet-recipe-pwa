"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { RecipeForm } from "@/components/recipe/recipe-form";
import type { AiRecipe } from "@/lib/types";
import { Link2, Type, Image as ImageIcon, PenLine } from "lucide-react";

type Tab = "url" | "text" | "image" | "manual";
const EMPTY: AiRecipe = { title: "", description: null, cook_time_min: null, servings: null, ingredients: [], steps: [], nutrition: { kcal: null, protein_g: null, fat_g: null, carb_g: null, source: "user_input" as any }, suggested_tags: [] };

export function AddClient({ allTags, initialUrl, initialText }: { allTags: any[]; initialUrl: string; initialText: string }) {
  const [tab, setTab] = useState<Tab>(initialUrl ? "url" : initialText ? "text" : "url");
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState(initialText);
  const [files, setFiles] = useState<File[]>([]);
  const [phase, setPhase] = useState<"input" | "analyzing" | "confirm">("input");
  const [status, setStatus] = useState("");
  const [draft, setDraft] = useState<AiRecipe | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [source, setSource] = useState<any>(undefined);
  const [mainImageUrl, setMainImageUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { if (initialUrl) analyzeUrl(initialUrl); /* eslint-disable-next-line */ }, []);

  async function analyzeUrl(u: string) {
    setPhase("analyzing"); setErr(null); setStatus("URLを確認しています…");
    try {
      const ing = await fetch("/api/ingest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: u }) }).then((r) => r.json());
      if (ing.error) throw new Error(ing.error);
      setSource({ url: ing.sourceUrl, site: ing.sourceSite, sns: ing.sourceSns, author: ing.sourceAuthor });
      setMainImageUrl(ing.mainImageUrl ?? null);
      if (ing.structured) { setDraft(ing.structured); setWarnings(ing.notes ?? []); setPhase("confirm"); return; }
      if (ing.kind === "unfetchable") {
        // Save URL only, let user enrich (spec §11.7).
        setDraft({ ...EMPTY, title: ing.title ?? "取り込んだレシピ", suggested_tags: [] });
        setWarnings([...(ing.notes ?? []), "本文を取得できませんでした。スクリーンショットまたは投稿文を追加してAI整理できます。"]);
        setPhase("confirm"); return;
      }
      setStatus("AIがレシピを整理しています…");
      await runAi({ text: ing.extractedText ?? ing.title ?? "", sourceHint: ing.sourceUrl, extraNotes: ing.notes ?? [] });
    } catch (e: any) { setErr(e.message); setPhase("input"); }
  }

  async function runAi({ text, images, sourceHint, extraNotes = [] }: { text?: string; images?: File[]; sourceHint?: string; extraNotes?: string[] }) {
    setPhase("analyzing"); setStatus("AIがレシピを整理しています…"); setErr(null);
    const fd = new FormData();
    if (text) fd.append("text", text);
    if (sourceHint) fd.append("sourceHint", sourceHint);
    (images ?? []).forEach((f) => fd.append("images", f));
    const res = await fetch("/api/ai/structure", { method: "POST", body: fd });
    const j = await res.json();
    if (!res.ok) {
      if (j.limitReached) { setErr("今月のAI解析上限に達しました。手動入力に切り替えます。"); setDraft(EMPTY); setPhase("confirm"); return; }
      setErr(j.error || "AI解析に失敗しました"); setPhase("input"); return;
    }
    setDraft(j.recipe); setWarnings([...(j.warnings ?? []), ...extraNotes]); setPhase("confirm");
  }

  if (phase === "analyzing") return <AnalyzingSkeleton status={status} />;
  if (phase === "confirm" && draft) return (
    <div>
      <h1 className="mb-3 text-lg font-bold">内容を確認して保存</h1>
      <RecipeForm initial={draft} warnings={warnings} source={source} mainImageUrl={mainImageUrl} allTags={allTags} />
    </div>
  );

  const tabs: [Tab, string, any][] = [["url", "URL", Link2], ["text", "テキスト", Type], ["image", "スクショ", ImageIcon], ["manual", "手動", PenLine]];
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">レシピを追加</h1>
      <div className="flex gap-1 rounded-xl bg-mist p-1">
        {tabs.map(([t, label, Icon]) => (
          <button key={t} onClick={() => setTab(t)} className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[11px] ${tab === t ? "bg-white text-sage-dark shadow-sm" : "text-ink/50"}`}>
            <Icon size={18} />{label}
          </button>
        ))}
      </div>

      {tab === "url" && (
        <Card className="space-y-3 p-4">
          <p className="text-xs text-ink/60">レシピサイト・ブログ・Instagram・TikTok・YouTubeのURLに対応</p>
          <Input placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" />
          <Button className="w-full" disabled={!url.trim()} onClick={() => analyzeUrl(url.trim())}>解析する</Button>
        </Card>
      )}
      {tab === "text" && (
        <Card className="space-y-3 p-4">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder="レシピの投稿文や材料・手順を貼り付け" className="w-full rounded-xl border border-beige bg-ivory px-3 py-2 text-sm" />
          <Button className="w-full" disabled={!text.trim()} onClick={() => runAi({ text })}>AIで整理する</Button>
        </Card>
      )}
      {tab === "image" && (
        <Card className="space-y-3 p-4">
          <p className="text-xs text-ink/60">材料と作り方のスクショを複数枚まとめて解析できます（最大4枚）</p>
          <input type="file" accept="image/*" multiple onChange={(e) => setFiles([...(e.target.files ?? [])].slice(0, 4))} className="text-xs" />
          <Button className="w-full" disabled={!files.length} onClick={() => runAi({ images: files })}>画像から整理する</Button>
        </Card>
      )}
      {tab === "manual" && (
        <RecipeForm initial={EMPTY} allTags={allTags} />
      )}
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  );
}

function AnalyzingSkeleton({ status }: { status: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-sage-dark">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-sage-dark border-t-transparent" />{status}
      </div>
      <div className="skeleton h-8 w-2/3 rounded-lg" />
      <div className="skeleton h-16 rounded-xl" />
      {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-9 rounded-lg" />)}
    </div>
  );
}
