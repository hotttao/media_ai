import { z } from 'zod'

export const createMaterialSchema = z.object({
  visibility: z.enum(['PUBLIC', 'PERSONAL', 'TEAM']).describe('Who can access this material.'),
  type: z.enum(['SCENE', 'POSE', 'MAKEUP', 'ACCESSORY', 'OTHER']).describe('Material category used for filtering and generation workflows.'),
  name: z.string().min(1, 'Name is required').max(100).describe('Human-readable material name.'),
  description: z.string().optional().describe('Optional notes describing the material usage or style.'),
  url: z.string().min(1, 'URL is required').describe('Public or internal URL of the material asset.'),
  tags: z.array(z.string()).optional().describe('Searchable labels attached to the material.'),
}).describe('Payload for creating a material asset.')

export const materialFilterSchema = z.object({
  type: z.enum(['SCENE', 'POSE', 'MAKEUP', 'ACCESSORY', 'OTHER']).optional().describe('Filter materials by category.'),
  visibility: z.enum(['PUBLIC', 'PERSONAL', 'TEAM']).optional().describe('Filter materials by visibility scope.'),
  search: z.string().optional().describe('Keyword used to search material names and metadata.'),
}).describe('Query filters for listing materials.')

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>
export type MaterialFilterInput = z.infer<typeof materialFilterSchema>
