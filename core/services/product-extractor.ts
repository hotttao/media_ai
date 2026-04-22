import { generateText } from "ai";
import { models } from "../llm";
import { EXTRACT_PRODUCT_INFO_PROMPT } from "../prompts/product";

interface ExtractedProductInfo {
  name: string;
  targetAudience: "MENS" | "WOMENS" | "KIDS";
  productDetails: string;
  displayActions: string;
}

export async function extractProductInfo(
  images: string[]
): Promise<ExtractedProductInfo | null> {
  const { text } = await generateText({
    system: EXTRACT_PRODUCT_INFO_PROMPT,
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

    const validAudiences = ["MENS", "WOMENS", "KIDS"];
    const targetAudience = validAudiences.includes(json.targetAudience)
      ? json.targetAudience
      : "WOMENS";

    return {
      name: typeof json.name === "string" ? json.name : "",
      targetAudience,
      productDetails:
        typeof json.productDetails === "string" ? json.productDetails : "",
      displayActions:
        typeof json.displayActions === "string" ? json.displayActions : "",
    };
  } catch {
    return null;
  }
}
