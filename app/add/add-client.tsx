"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { RecipeForm } from "@/components/recipe/recipe-form";
import type { AiRecipe, DuplicateRecipe, IngestErrorCode } from "@/lib/types";
import { SHARE_INSTAGRAM_URL_MISSING_MESSAGE } from "@/lib/ingest/share-target";
import { AlertCircle, ExternalLink, Image as ImageIcon, Link2, PenLine, RefreshCw, Type, Video } from "lucide-react";

type Tab = "url" | "text" | "image" | "manual";
type Phase = "input" | "analyzing" | "confirm" | "needs-more" | "duplicate";

const EMPTY: AiRecipe = {
  title: "",
  description: null,
  cook_time_min: null,
  servings: null,
  ingredients: [],
  steps: [],
  nutrition: { kcal: null, protein_g: null, fat_g: null, carb_g: null, source: "user_input" as any },
  suggested_tags: [],
  ai_estimated_fields: [],
  analysis_confidence: null,
};

interface SourceMeta {
  url?: string | null;
  originalUrl?: string | null;
  normalizedUrl?: string | null;
  site?: string | null;
  sns?: string | null;
  author?: string | null;
  instagramPostId?: string | null;
  importMethod?: string | null;
  fetchedAt?: string | null;
  sourceRawText?: string | null;
  aiEstimatedFields?: string[];
  analysisConfidence?: number | null;
}

interface IngestResponse {
  kind: string;
  sourceUrl: string;
  originalSourceUrl?: string | null;
  normalizedSourceUrl?: string | null;
  sourceSite?: string | null;
  sourceSns?: string | null;
  sourceAuthor?: string | null;
  instagramPostId?: string | null;
  importMethod?: string | null;
  sourceFetchedAt?: string | null;
  title?: string | null;
  mainImageUrl?: string | null;
  extractedText?: string | null;
  sourceRawText?: string | null;
  structured?: AiRecipe | null;
  errorCode?: IngestErrorCode | null;
  userMessage?: string | null;
  nextActions?: string[];
  requiresAdditionalInput?: boolean;
  duplicates?: DuplicateRecipe[];
  notes?: string[];
  error?: string;
}

export function AddClient({
  allTags,
  initialUrl,
  initialText,
  initialShareError = "",
  fromShareTarget = false,
}: {
  allTags: any[];
  initialUrl: string;
  initialText: string;
  initialShareError?: string;
  fromShareTarget?: boolean;
}) {
  const [tab, setTab] = useState<Tab>(initialUrl ? "url" : initialText ? "text" : "url");
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState(initialText);
  const [files, setFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [phase, setPhase] = useState<Phase>("input");
  const [status, setStatus] = useState("");
  const [draft, setDraft] = useState<AiRecipe | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [source, setSource] = useState<SourceMeta | undefined>(undefined);
  const [mainImageUrl, setMainImageUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(shareErrorMessage(initialShareError));
  const [pendingIngest, setPendingIngest] = useState<IngestResponse | null>(null);
  const [updateRecipeId, setUpdateRecipeId] = useState<string | undefined>(undefined);
  const [duplicateAction, setDuplicateAction] = useState<"save_as_new" | undefined>(undefined);

  useEffect(() => { if (initialUrl) analyzeUrl(initialUrl); /* eslint-disable-next-line */ }, []);

  async function analyzeUrl(rawUrl: string) {
    setPhase("analyzing");
    setErr(null);
    setStatus("URLを確認しています...");
    setUpdateRecipeId(undefined);
    setDuplicateAction(undefined);
    try {
      const ing: IngestResponse = await fetch("/api/ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: rawUrl }),
      }).then((r) => r.json());
      if (ing.error) throw new Error(ing.error);
      setPendingIngest(ing);
      if (ing.duplicates?.length) {
        setSource(sourceFromIngest(ing));
        setMainImageUrl(ing.mainImageUrl ?? null);
        setPhase("duplicate");
        return;
      }
      await continueFromIngest(ing);
    } catch (e: any) {
      setErr(e.message);
      setPhase("input");
    }
  }

  async function continueFromIngest(ing: IngestResponse, opts: { updateId?: string; saveAsNew?: boolean } = {}) {
    const nextSource = sourceFromIngest(ing);
    setSource(nextSource);
    setMainImageUrl(ing.mainImageUrl ?? null);
    setWarnings(ing.notes ?? []);
    setUpdateRecipeId(opts.updateId);
    setDuplicateAction(opts.saveAsNew ? "save_as_new" : undefined);

    if (ing.structured) {
      setDraft(ing.structured);
      setPhase("confirm");
      return;
    }
    if (ing.kind === "instagram" && ing.requiresAdditionalInput) {
      setPhase("needs-more");
      return;
    }
    if (ing.kind === "unfetchable") {
      setDraft({ ...EMPTY, title: ing.title ?? "取り込んだレシピ", suggested_tags: [] });
      setWarnings([...(ing.notes ?? []), "本文を取得できませんでした。スクリーンショットまたは投稿文を追加してAI整理できます。"]);
      setPhase("confirm");
      return;
    }

    setStatus("AIがレシピを整理しています...");
    await runAi({
      text: ing.extractedText ?? ing.title ?? "",
      sourceHint: buildSourceHint(ing),
      extraNotes: ing.notes ?? [],
      sourceOverride: nextSource,
    });
  }

  async function runAi({
    text,
    images,
    videos,
    sourceHint,
    extraNotes = [],
    sourceOverride,
  }: {
    text?: string;
    images?: File[];
    videos?: File[];
    sourceHint?: string;
    extraNotes?: string[];
    sourceOverride?: SourceMeta;
  }) {
    setPhase("analyzing");
    setStatus(videos?.length ? "動画から使える場面を切り出しています..." : "AIがレシピを整理しています...");
    setErr(null);

    const frameFiles = videos?.length ? await extractVideoFrames(videos, Math.max(1, 8 - (images?.length ?? 0))) : [];
    const fd = new FormData();
    if (text) fd.append("text", text);
    if (sourceHint) fd.append("sourceHint", sourceHint);
    [...(images ?? []), ...frameFiles].slice(0, 8).forEach((f) => fd.append("images", f));

    setStatus("AIがレシピを整理しています...");
    const res = await fetch("/api/ai/structure", { method: "POST", body: fd });
    const j = await res.json();
    if (!res.ok) {
      if (j.limitReached) {
        setErr("今月のAI解析上限に達しました。手動入力に切り替えます。");
        setDraft(EMPTY);
        setPhase("confirm");
        return;
      }
      setErr(j.error || "AI解析に失敗しました");
      setPhase("input");
      return;
    }

    const nextSource = {
      ...(sourceOverride ?? source),
      sourceRawText: mergeSourceText(sourceOverride?.sourceRawText ?? source?.sourceRawText, text),
      aiEstimatedFields: j.aiEstimatedFields ?? j.recipe?.ai_estimated_fields ?? [],
      analysisConfidence: j.analysisConfidence ?? j.recipe?.analysis_confidence ?? null,
    };
    setSource(nextSource);
    setDraft(j.recipe);
    setWarnings([...(j.warnings ?? []), ...extraNotes]);
    setPhase("confirm");
  }

  async function analyzeSupplement() {
    if (!pendingIngest) return;
    const combinedText = mergeSourceText(pendingIngest.extractedText ?? pendingIngest.title ?? "", text);
    await runAi({
      text: combinedText ?? undefined,
      images: files,
      videos: videoFiles,
      sourceHint: buildSourceHint(pendingIngest),
      extraNotes: pendingIngest.notes ?? [],
      sourceOverride: sourceFromIngest(pendingIngest),
    });
  }

  if (phase === "analyzing") return <AnalyzingSkeleton status={status} />;
  if (phase === "confirm" && draft) return (
    <div>
      <h1 className="mb-3 text-lg font-bold">内容を確認して保存</h1>
      <RecipeForm
        initial={draft}
        warnings={warnings}
        source={source}
        mainImageUrl={mainImageUrl}
        allTags={allTags}
        recipeId={updateRecipeId}
        duplicateAction={duplicateAction}
      />
    </div>
  );
  if (phase === "duplicate" && pendingIngest?.duplicates?.length) return (
    <DuplicateChoice
      duplicate={pendingIngest.duplicates[0]}
      onOpen={() => { window.location.href = `/recipes/${pendingIngest.duplicates![0].id}`; }}
      onUpdate={() => continueFromIngest(pendingIngest, { updateId: pendingIngest.duplicates![0].id })}
      onSaveAsNew={() => continueFromIngest(pendingIngest, { saveAsNew: true })}
    />
  );
  if (phase === "needs-more" && pendingIngest) return (
    <InstagramFallback
      ingest={pendingIngest}
      text={text}
      setText={setText}
      files={files}
      setFiles={setFiles}
      videoFiles={videoFiles}
      setVideoFiles={setVideoFiles}
      onAnalyze={analyzeSupplement}
      onManual={() => {
        setDraft({ ...EMPTY, title: pendingIngest.title ?? "Instagramレシピ" });
        setSource(sourceFromIngest(pendingIngest));
        setWarnings(pendingIngest.notes ?? []);
        setPhase("confirm");
      }}
    />
  );

  const tabs: [Tab, string, any][] = [["url", "URL", Link2], ["text", "テキスト", Type], ["image", "スクショ", ImageIcon], ["manual", "手動", PenLine]];
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">レシピを追加</h1>
      {fromShareTarget && !initialUrl && (
        <Card className="space-y-2 border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <p className="font-semibold">Instagram共有を受け取りました</p>
          <p>URL貼り付け、クリップボードから貼り付け、投稿文の貼り付け、スクリーンショット追加で続けられます。</p>
        </Card>
      )}
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
          <p className="text-xs text-ink/60">材料と作り方のスクショを複数枚まとめて解析できます（最大8枚）</p>
          <input type="file" accept="image/*" multiple onChange={(e) => setFiles([...(e.target.files ?? [])].slice(0, 8))} className="text-xs" />
          <Button className="w-full" disabled={!files.length} onClick={() => runAi({ images: files })}>画像から整理する</Button>
        </Card>
      )}
      {tab === "manual" && (
        <RecipeForm initial={EMPTY} allTags={allTags} />
      )}
      {err && (
        <Card className="border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {err}
        </Card>
      )}
    </div>
  );
}

function DuplicateChoice({ duplicate, onOpen, onUpdate, onSaveAsNew }: {
  duplicate: DuplicateRecipe;
  onOpen: () => void;
  onUpdate: () => void;
  onSaveAsNew: () => void;
}) {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">同じ投稿が登録済みです</h1>
      <Card className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          {duplicate.main_image_url && <img src={duplicate.main_image_url} alt="" className="h-16 w-16 rounded-lg object-cover" />}
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{duplicate.title}</p>
            <p className="mt-1 text-xs text-ink/50">このInstagram投稿は既にレシピとして保存されています。</p>
          </div>
        </div>
        <div className="grid gap-2">
          <Button onClick={onOpen}><ExternalLink size={16} />既存レシピを開く</Button>
          <Button variant="outline" onClick={onUpdate}><RefreshCw size={16} />既存レシピを更新する</Button>
          <Button variant="ghost" onClick={onSaveAsNew}>別レシピとして保存する</Button>
        </div>
      </Card>
    </div>
  );
}

function InstagramFallback({
  ingest,
  text,
  setText,
  files,
  setFiles,
  videoFiles,
  setVideoFiles,
  onAnalyze,
  onManual,
}: {
  ingest: IngestResponse;
  text: string;
  setText: (value: string) => void;
  files: File[];
  setFiles: (files: File[]) => void;
  videoFiles: File[];
  setVideoFiles: (files: File[]) => void;
  onAnalyze: () => void;
  onManual: () => void;
}) {
  const hasExtra = Boolean(text.trim() || files.length || videoFiles.length);
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Instagram投稿を追加</h1>
      <Card className="space-y-3 border-amber-200 bg-amber-50 p-4">
        <div className="flex gap-2 text-sm font-semibold text-amber-800">
          <AlertCircle size={18} />
          <span>{ingest.userMessage ?? errorLabel(ingest.errorCode)}</span>
        </div>
        <p className="text-xs leading-relaxed text-amber-800/80">
          URLは保存できます。投稿文・スクリーンショット・料理画像・動画を追加すると、元のInstagram URLとまとめてAI解析できます。
        </p>
      </Card>

      <Card className="space-y-3 p-4">
        <label className="block text-xs font-semibold text-ink/60">投稿文を貼り付ける</label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} placeholder="Instagramのキャプション、材料、作り方など" className="w-full rounded-xl border border-beige bg-ivory px-3 py-2 text-sm" />
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-ink/60"><ImageIcon size={16} />スクリーンショット・料理画像を追加する</div>
        <input type="file" accept="image/*" multiple onChange={(e) => setFiles([...(e.target.files ?? [])].slice(0, 8))} className="text-xs" />
        {files.length > 0 && <p className="text-xs text-ink/50">{files.length}枚を追加しました</p>}
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-ink/60"><Video size={16} />動画を追加する</div>
        <input type="file" accept="video/*" multiple onChange={(e) => setVideoFiles([...(e.target.files ?? [])].slice(0, 2))} className="text-xs" />
        {videoFiles.length > 0 && <p className="text-xs text-ink/50">動画から数枚の静止画を切り出して解析します</p>}
      </Card>

      <div className="grid gap-2">
        <Button disabled={!hasExtra} onClick={onAnalyze}>追加情報と一緒にAI解析する</Button>
        <Button variant="outline" onClick={onManual}>手動入力へ切り替える</Button>
        {ingest.normalizedSourceUrl && <Link href={ingest.normalizedSourceUrl} target="_blank" className="text-center text-xs text-sage-dark underline">元のInstagram投稿を開く</Link>}
      </div>
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

function sourceFromIngest(ing: IngestResponse): SourceMeta {
  return {
    url: ing.normalizedSourceUrl ?? ing.sourceUrl,
    originalUrl: ing.originalSourceUrl ?? ing.sourceUrl,
    normalizedUrl: ing.normalizedSourceUrl ?? ing.sourceUrl,
    site: ing.sourceSite ?? null,
    sns: ing.sourceSns ?? null,
    author: ing.sourceAuthor ?? null,
    instagramPostId: ing.instagramPostId ?? null,
    importMethod: ing.importMethod ?? (ing.kind === "instagram" ? "instagram_oembed" : "url"),
    fetchedAt: ing.sourceFetchedAt ?? new Date().toISOString(),
    sourceRawText: ing.sourceRawText ?? ing.extractedText ?? null,
  };
}

function buildSourceHint(ing: IngestResponse): string {
  return [
    ing.normalizedSourceUrl ? `正規化URL: ${ing.normalizedSourceUrl}` : "",
    ing.originalSourceUrl ? `元URL: ${ing.originalSourceUrl}` : "",
    ing.instagramPostId ? `Instagram投稿ID: ${ing.instagramPostId}` : "",
  ].filter(Boolean).join("\n") || ing.sourceUrl;
}

function mergeSourceText(base?: string | null, extra?: string | null): string | null {
  const text = [base, extra].filter((v) => v && v.trim()).join("\n\n--- 追加情報 ---\n");
  return text ? text.slice(0, 30000) : null;
}

function errorLabel(code?: IngestErrorCode | null): string {
  switch (code) {
    case "private_post": return "非公開投稿です";
    case "deleted_post": return "削除済み投稿です";
    case "login_required": return "ログインが必要です";
    case "invalid_url": return "URLが無効です";
    case "no_recipe_content": return "材料・手順が投稿内に見つかりません";
    case "temporary_instagram_error": return "Instagram側の一時的なエラーです";
    default: return "投稿情報を取得できません";
  }
}

function shareErrorMessage(code: string): string | null {
  if (code === "instagram_url_missing") return SHARE_INSTAGRAM_URL_MISSING_MESSAGE;
  return null;
}

async function extractVideoFrames(videoFiles: File[], maxFrames: number): Promise<File[]> {
  const frames: File[] = [];
  for (const file of videoFiles) {
    if (frames.length >= maxFrames) break;
    const url = URL.createObjectURL(file);
    try {
      const video = document.createElement("video");
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error("動画を読み込めませんでした"));
      });
      const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1;
      const slots = [0.15, 0.4, 0.7, 0.9].slice(0, Math.max(1, maxFrames - frames.length));
      for (const pct of slots) {
        await seekVideo(video, Math.min(duration * pct, Math.max(0, duration - 0.2)));
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 1280 / Math.max(video.videoWidth || 1, video.videoHeight || 1));
        canvas.width = Math.max(1, Math.round((video.videoWidth || 720) * scale));
        canvas.height = Math.max(1, Math.round((video.videoHeight || 1280) * scale));
        canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
        if (blob) frames.push(new File([blob], `${file.name}-frame-${frames.length + 1}.jpg`, { type: "image/jpeg" }));
        if (frames.length >= maxFrames) break;
      }
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  return frames;
}

function seekVideo(video: HTMLVideoElement, seconds: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = () => {
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done);
    video.onerror = () => reject(new Error("動画のフレームを取得できませんでした"));
    video.currentTime = seconds;
  });
}
