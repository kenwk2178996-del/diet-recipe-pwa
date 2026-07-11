import Anthropic from "@anthropic-ai/sdk";
import { AiRecipeSchema } from "@/lib/types";
import type { AiProvider, StructureInput, StructureOutput } from "./provider";
import { SYSTEM_PROMPT, RECIPE_TOOL } from "./prompt";

export class AnthropicProvider implements AiProvider {
  name = "anthropic";
  private client: Anthropic;
  private model: string;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    this.model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
  }

  async structureRecipe(input: StructureInput): Promise<StructureOutput> {
    const content: Anthropic.MessageParam["content"] = [];
    for (const img of input.images ?? []) {
      content.push({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.base64 } });
    }
    const textParts = [
      input.sourceHint ? `参照元: ${input.sourceHint}` : "",
      input.text ? `--- 抽出テキスト ---\n${input.text}` : "",
      "上記からレシピを抽出し emit_recipe ツールで返してください。",
    ].filter(Boolean).join("\n\n");
    content.push({ type: "text", text: textParts });

    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: [RECIPE_TOOL as any],
      tool_choice: { type: "tool", name: "emit_recipe" },
      messages: [{ role: "user", content }],
    });

    const toolUse = res.content.find((c) => c.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") throw new Error("AI did not return structured output");
    const recipe = AiRecipeSchema.parse(toolUse.input);
    return { recipe, tokensIn: res.usage.input_tokens, tokensOut: res.usage.output_tokens };
  }
}
