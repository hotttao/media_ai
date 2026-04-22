import { generateText } from "ai";
import { models } from "../llm";
import { EXTRACT_MATERIAL_INFO_PROMPT } from "../prompts/material";

interface ExtractedMaterialInfo {
  name: string;
  type: "CLOTHING" | "SCENE" | "ACTION" | "MAKEUP" | "ACCESSORY" | "OTHER";
  description: string;
  tags: string[];
}

export async function extractMaterialInfo(
  images: string[]
): Promise<ExtractedMaterialInfo | null> {
  const { text } = await generateText({
    system: EXTRACT_MATERIAL_INFO_PROMPT,
    model: models.extract,
    messages: [
      {
        role: "user",
        content: images.map((imageDataUrl) => ({
          type: "image" as const,
          image: imageDataUrl,
        })),
      },
    ],
  });

  // Remove thinking tags and markdown code blocks
  const cleanText = text
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const json = JSON.parse(jsonMatch[0]);

    const validTypes = ["CLOTHING", "SCENE", "ACTION", "MAKEUP", "ACCESSORY", "OTHER"];
    const type = validTypes.includes(json.type)
      ? json.type
      : "OTHER";

    return {
      name: typeof json.name === "string" ? json.name : "",
      type,
      description: typeof json.description === "string" ? json.description : "",
      tags: Array.isArray(json.tags) ? json.tags.filter((t: any) => typeof t === "string") : [],
    };
  } catch {
    return null;
  }
}
