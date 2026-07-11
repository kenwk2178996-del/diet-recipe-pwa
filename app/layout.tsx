import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/bottom-nav";
import { ClipboardWatcher } from "@/components/clipboard-watcher";
import { SwRegister } from "@/components/sw-register";

export const metadata: Metadata = {
  title: "ダイエットレシピ",
  description: "SNS・WebのレシピをAIで整理して保存・検索",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "レシピ" },
};
export const viewport: Viewport = {
  themeColor: "#CADBB7", width: "device-width", initialScale: 1, viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-dvh pb-16">
        <ClipboardWatcher />
        <SwRegister />
        <main className="mx-auto w-full max-w-2xl px-4 pt-4">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
