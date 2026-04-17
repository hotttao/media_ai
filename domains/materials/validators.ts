import { z } from 'zod'

export const createMaterialSchema = z.object({
  visibility: z.enum(['PUBLIC', 'PERSONAL', 'TEAM']),
  type: z.enum(['CLOTHING', 'SCENE', 'ACTION', 'MAKEUP', 'ACCESSORY', 'OTHER']),
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  url: z.string().min(1, 'URL is required'),
  tags: z.array(z.string()).optional(),
})

export const materialFilterSchema = z.object({
  type: z.enum(['CLOTHING', 'SCENE', 'ACTION', 'MAKEUP', 'ACCESSORY', 'OTHER']).optional(),
  visibility: z.enum(['PUBLIC', 'PERSONAL', 'TEAM']).optional(),
  search: z.string().optional(),
})

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>
export type MaterialFilterInput = z.infer<typeof materialFilterSchema>