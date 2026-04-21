import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { getEnvVariable } from "./env";

const minimax = createOpenAICompatible({
  name: "minimax",
  apiKey: getEnvVariable("MINIMAX_API_KEY"),
  baseURL: `https://api.minimaxi.com/v1`,
});

export const models = {
  extract: minimax("MiniMax-M2.7"),
  memory: minimax("MiniMax-M2.7"),
  compactor: minimax("MiniMax-M2.7"),
};

export const extractJson = (output: string) => {
  const jsonMatch = output.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error("Failed to parse JSON:", error);
      return null;
    }
  }
};

function extractTagContent(input: string, tag: string): string {
  const openRe = new RegExp(`<${tag}(?=\\s|>)\\b[^>]*>`, "gi");
  const closeRe = new RegExp(`</${tag}\\s*>`, "gi");

  const firstOpen = openRe.exec(input);
  if (!firstOpen) return "";

  const startEnd = openRe.lastIndex;
  let depth = 1;

  while (true) {
    const nextOpen = openRe.exec(input);
    const nextClose = closeRe.exec(input);

    if (!nextClose) return "";

    if (nextOpen && nextOpen.index < nextClose.index) {
      depth++;
    } else {
      depth--;
      if (depth === 0) {
        const endIdx = nextClose.index;
        return input.slice(startEnd, endIdx).trim();
      }
    }
  }
}

export function parseAnalysisSummary(input: string): {
  analysis: string;
  summary: string;
} {
  const analysis = extractTagContent(input, "analysis");
  const summary = extractTagContent(input, "summary");
  return { analysis, summary };
}
