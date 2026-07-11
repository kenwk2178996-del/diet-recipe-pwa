"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, PlusCircle, Settings } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function BottomNav() {
  const path = usePathname();
  if (path?.startsWith("/login")) return null;
  const items = [
    { href: "/", icon: Home, label: "ホーム" },
    { href: "/search", icon: Search, label: "検索" },
    { href: "/add", icon: PlusCircle, label: "追加" },
    { href: "/settings", icon: Settings, label: "設定" },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-beige bg-ivory/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl">
        {items.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? path === "/" : path?.startsWith(href);
          return (
            <Link key={href} href={href} className={cn("flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]", active ? "text-sage-dark" : "text-ink/50")}>
              <Icon size={22} strokeWidth={active ? 2.4 : 1.8} /> {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
