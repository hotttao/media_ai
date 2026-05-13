import { generateText } from "ai";
import { models } from "../llm";
import fs from "fs";
import path from "path";

const PUBLISH_CONTENT_PROMPT = fs.readFileSync(
  path.join(process.cwd(), "core/prompts/发布内容.md"),
  "utf-8"
);

export interface GeneratedTitleContent {
  title: string;
  content: string;
}

export interface GenerateResult {
  results: GeneratedTitleContent[];
  prompt: string;
  productName: string;
  productImage: string;
}

/**
 * 使用 AI 生成视频发布标题和内容
 * @param productName 产品名称
 * @param productImage 产品图片 URL
 * @returns 包含生成结果和调试信息的对象
 */
export async function generateVideoTitleContent(
  productName: string,
  productImage: string
): Promise<GenerateResult> {
  const prompt = PUBLISH_CONTENT_PROMPT
    .replace("{{ product_name }}", productName)
    .replace("{{ product_image }}", productImage);

  const { text } = await generateText({
    model: models.chat,
    messages: [{ role: "user", content: prompt }],
    maxRetries: 1,
    timeout: 120000,
  });

  // Extract JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return { results: [], prompt, productName, productImage };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (Array.isArray(parsed)) {
      const results = parsed.slice(0, 3).map((item: any) => ({
        title: typeof item.title === "string" ? item.title : "",
        content: typeof item.content === "string" ? item.content : "",
      }));
      return { results, prompt, productName, productImage };
    }
    return { results: [], prompt, productName, productImage };
  } catch {
    return { results: [], prompt, productName, productImage };
  }
}