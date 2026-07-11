"use client";
import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

type Mode = "signin" | "signup" | "reset";

export default function LoginPage() {
  const sb = getBrowserSupabase();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null); const [busy, setBusy] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      if (mode === "signin") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error; window.location.href = "/";
      } else if (mode === "signup") {
        const { error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: `${origin}/auth/callback` } });
        if (error) throw error; setMsg("確認メールを送信しました。メール内リンクから認証してください。");
      } else {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback` });
        if (error) throw error; setMsg("パスワード再設定メールを送信しました。");
      }
    } catch (e: any) { setMsg(e?.message || "エラーが発生しました"); } finally { setBusy(false); }
  }

  async function google() {
    await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${origin}/auth/callback` } });
  }

  return (
    <div className="mx-auto mt-10 max-w-sm">
      <h1 className="mb-1 text-center text-2xl font-bold text-sage-dark">ダイエットレシピ</h1>
      <p className="mb-6 text-center text-xs text-ink/60">URL・スクショ・テキストからAIで整理して保存</p>
      <Card className="p-5">
        <form onSubmit={submit} className="space-y-3">
          <Input type="email" placeholder="メールアドレス" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {mode !== "reset" && <Input type="password" placeholder="パスワード" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />}
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === "signin" ? "ログイン" : mode === "signup" ? "新規登録" : "再設定メールを送る"}
          </Button>
        </form>
        {mode !== "reset" && (
          <>
            <div className="my-3 text-center text-[11px] text-ink/40">または</div>
            <Button variant="outline" className="w-full" onClick={google}>Googleでログイン</Button>
          </>
        )}
        {msg && <p className="mt-3 text-center text-xs text-red-600">{msg}</p>}
        <div className="mt-4 flex justify-between text-[11px] text-sage-dark">
          {mode !== "signin" && <button onClick={() => setMode("signin")}>ログイン</button>}
          {mode !== "signup" && <button onClick={() => setMode("signup")}>新規登録</button>}
          {mode !== "reset" && <button onClick={() => setMode("reset")}>パスワードを忘れた</button>}
        </div>
      </Card>
    </div>
  );
}
