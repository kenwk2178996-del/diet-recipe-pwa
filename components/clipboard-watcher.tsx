"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
// iOS Share-Target fallback (spec §6): detect a recipe URL on the clipboard.
export function ClipboardWatcher() {
  const [url, setUrl] = useState<string | null>(null);
  const router = useRouter();
  useEffect(() => {
    const check = async () => {
      try {
        if (!navigator.clipboard?.readText) return;
        const t = (await navigator.clipboard.readText()).trim();
        if (/^https?:\/\/\S+$/.test(t)) setUrl(t);
      } catch { /* permission denied — silent */ }
    };
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);
  if (!url) return null;
  return (
    <button onClick={() => { router.push(`/add?url=${encodeURIComponent(url)}`); setUrl(null); }}
      className="fixed inset-x-0 top-0 z-50 bg-sage-dark px-4 py-2 text-center text-xs text-white">
      クリップボードのURLからレシピを追加 →
    </button>
  );
}
