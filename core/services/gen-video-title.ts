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

  console.log('[generateVideoTitleContent] Starting AI generation for product:', productName)

  const startTime = Date.now()
  const { text } = await generateText({
    model: models.chat,
    messages: [{ role: "user", content: prompt }],
    maxRetries: 1,
    timeout: 120000,
    providerOptions: {
      minimax: {
        // 禁用思考模式，减少响应延迟
        thinking: { type: 'disabled' } as any,
      },
    },
  })
  console.log('[generateVideoTitleContent] AI responded in', Date.now() - startTime, 'ms')

  // 过滤掉思考过程
  const cleanText = text.replace(/<[^>]*>/g, '').trim()
  console.log('[generateVideoTitleContent] AI raw response length:', cleanText.length)
  console.log('[generateVideoTitleContent] AI raw response:', cleanText)

  // Extract JSON from response
  const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.log('[generateVideoTitleContent] No JSON array found in response')
    return { results: [], prompt, productName, productImage };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (Array.isArray(parsed)) {
      const results = parsed.slice(0, 3).map((item: any) => ({
        title: typeof item.title === "string" ? item.title : "",
        content: typeof item.content === "string" ? item.content : "",
      }));
      console.log('[generateVideoTitleContent] Generated', results.length, 'results')
      return { results, prompt, productName, productImage };
    }
    return { results: [], prompt, productName, productImage };
  } catch {
    console.error('[generateVideoTitleContent] JSON parse error')
    return { results: [], prompt, productName, productImage };
  }
}