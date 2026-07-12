import { ChefHat } from "lucide-react";

export function RecipeImageFallback({ title, compact = false }: { title?: string | null; compact?: boolean }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-beige text-sage-dark">
      <div className="flex flex-col items-center gap-1 px-2 text-center">
        <ChefHat size={compact ? 18 : 30} strokeWidth={1.8} />
        {!compact && (
          <span className="line-clamp-2 text-xs font-semibold leading-snug text-ink/55">
            {title || "料理イメージ"}
          </span>
        )}
      </div>
    </div>
  );
}
