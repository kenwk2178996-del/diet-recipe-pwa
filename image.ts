// Provider-agnostic contract. Swap implementations behind AI_PROVIDER (spec §3).
import type { AiRecipe } from "@/lib/types";

export interface AiImage { mediaType: "image/jpeg" | "image/png" | "image/webp"; base64: string; }

export interface StructureInput {
  text?: string | null;      // page body / post text / partial data
  images?: AiImage[];        // one or more screenshots (materials + steps)
  sourceHint?: string | null;
}

export interface StructureOutput {
  recipe: AiRecipe;
  tokensIn: number;
  tokensOut: number;
}

export interface AiProvider {
  name: string;
  structureRecipe(input: StructureInput): Promise<StructureOutput>;
}
