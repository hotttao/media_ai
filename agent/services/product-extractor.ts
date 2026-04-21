import { extractJson } from '../../core/llm'
import { EXTRACT_PRODUCT_INFO_PROMPT } from '../prompts/product'

interface ExtractedProductInfo {
  name: string
  targetAudience: 'MENS' | 'WOMENS' | 'KIDS'
  productDetails: string
  displayActions: string
}

export async function extractProductInfo(
  images: string[], // Base64 data URLs
  model: (messages: any[]) => Promise<string>
): Promise<ExtractedProductInfo | null> {
  // 构建消息：系统提示 + 用户消息（含图片）
  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: EXTRACT_PRODUCT_INFO_PROMPT },
        ...images.map(imageDataUrl => ({
          type: 'image_url' as const,
          image_url: { url: imageDataUrl },
        })),
      ],
    },
  ]

  const response = await model(messages)
  const json = extractJson(response)

  if (!json) return null

  // 验证并规范化返回数据
  const validAudiences = ['MENS', 'WOMENS', 'KIDS']
  const targetAudience = validAudiences.includes(json.targetAudience)
    ? json.targetAudience
    : 'WOMENS' // 默认女装

  return {
    name: typeof json.name === 'string' ? json.name : '',
    targetAudience,
    productDetails: typeof json.productDetails === 'string' ? json.productDetails : '',
    displayActions: typeof json.displayActions === 'string' ? json.displayActions : '',
  }
}
