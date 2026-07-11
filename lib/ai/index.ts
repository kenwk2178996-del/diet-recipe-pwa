import type { AiProvider } from "./provider";
import { AnthropicProvider } from "./anthropic";

// Factory — add new providers here; selection via AI_PROVIDER env (spec §3).
export function getAiProvider(): AiProvider {
  const which = (process.env.AI_PROVIDER || "anthropic").toLowerCase();
  switch (which) {
    case "anthropic":
    default:
      return new AnthropicProvider();
  }
}
export * from "./provider";
