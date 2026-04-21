import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(1, '产品名称不能为空').max(200),
  targetAudience: z.enum(['MENS', 'WOMENS', 'KIDS']),
  productDetails: z.string().optional(),
  displayActions: z.string().optional(),
  tags: z.array(z.string()).optional(),
  images: z.array(z.object({
    url: z.string().min(1),
    isMain: z.boolean().default(false),
    order: z.number().int().min(0).default(0),
  })).optional(),
})

export const productFilterSchema = z.object({
  targetAudience: z.enum(['MENS', 'WOMENS', 'KIDS']).optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export const extractProductInfoSchema = z.object({
  images: z.array(z.string().describe('Base64 encoded image data URL')).min(1),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export type ProductFilterInput = z.infer<typeof productFilterSchema>
export type ExtractProductInfoInput = z.infer<typeof extractProductInfoSchema>