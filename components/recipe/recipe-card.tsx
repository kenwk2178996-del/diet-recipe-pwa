import Link from "next/link";
import { Star, Heart } from "lucide-react";
import { Card } from "@/components/ui/card";

export interface RecipeCardData {
  id: string; title: string; main_image_url: string | null; cook_time_min: number | null;
  is_favorite: boolean; rating: number | null; status: string;
  nutrition?: { kcal: number | null; protein_g: number | null } | { kcal: number | null; protein_g: number | null }[] | null;
}
function nut(r: RecipeCardData) { return Array.isArray(r.nutrition) ? r.nutrition[0] : r.nutrition; }

export function RecipeCard({ r, layout = "grid" }: { r: RecipeCardData; layout?: "grid" | "list" }) {
  const n = nut(r);
  if (layout === "list") {
    return (
      <Link href={`/recipes/${r.id}`}>
        <Card className="flex gap-3 overflow-hidden p-2">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-beige">
            {r.main_image_url && <img src={r.main_image_url} alt="" className="h-full w-full object-cover" loading="lazy" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              {r.is_favorite && <Heart size={13} className="fill-red-400 text-red-400" />}
              <p className="truncate text-sm font-semibold">{r.title}</p>
            </div>
            <p className="mt-1 text-xs text-ink/60">
              {n?.kcal != null ? `${Math.round(n.kcal)}kcal` : ""} {n?.protein_g != null ? `・P ${Math.round(n.protein_g)}g` : ""} {r.cook_time_min ? `・${r.cook_time_min}分` : ""}
            </p>
          </div>
        </Card>
      </Link>
    );
  }
  return (
    <Link href={`/recipes/${r.id}`}>
      <Card className="overflow-hidden">
        <div className="relative aspect-[4/3] bg-beige">
          {r.main_image_url && <img src={r.main_image_url} alt="" className="h-full w-full object-cover" loading="lazy" />}
          {r.is_favorite && <Heart size={16} className="absolute right-2 top-2 fill-red-400 text-red-400" />}
          {r.status === "draft" && <span className="absolute left-2 top-2 rounded bg-ink/70 px-1.5 py-0.5 text-[10px] text-white">下書き</span>}
        </div>
        <div className="p-2.5">
          <p className="truncate text-sm font-semibold">{r.title}</p>
          <p className="mt-0.5 text-xs text-ink/60">
            {n?.kcal != null ? `${Math.round(n.kcal)}kcal` : "kcal—"} {n?.protein_g != null ? `・P${Math.round(n.protein_g)}g` : ""}
          </p>
          {r.rating ? <div className="mt-1 flex">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} size={11} className="fill-amber-400 text-amber-400" />)}</div> : null}
        </div>
      </Card>
    </Link>
  );
}
