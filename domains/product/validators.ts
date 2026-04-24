import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200).describe('Product display name.'),
  targetAudience: z.enum(['MENS', 'WOMENS', 'KIDS']).describe('Primary customer segment for this product.'),
  productDetails: z.string().optional().describe('Free-form product details, selling points, fabric, fit, or usage context.'),
  displayActions: z.string().optional().describe('Desired presentation actions or poses for generated product media.'),
  tags: z.array(z.string()).optional().describe('Searchable labels attached to the product.'),
  images: z.array(z.object({
    url: z.string().min(1).describe('Image URL.'),
    isMain: z.boolean().default(false).describe('Whether this image is the primary product image.'),
    order: z.number().int().min(0).default(0).describe('Sort order for product images.'),
  }).describe('Product image metadata.')).optional().describe('Images associated with the product.'),
}).describe('Payload for creating a product.')

export const productFilterSchema = z.object({
  targetAudience: z.enum(['MENS', 'WOMENS', 'KIDS']).optional().describe('Filter products by target audience.'),
  search: z.string().optional().describe('Keyword used to search product names and metadata.'),
  tags: z.array(z.string()).optional().describe('Filter products by tags.'),
}).describe('Query filters for listing products.')

export const extractProductInfoSchema = z.object({
  images: z.array(z.string().describe('Base64 encoded image data URL')).min(1).describe('Images to analyze for product information extraction.'),
}).describe('Payload for extracting product information from images.')

export const updateProductSchema = createProductSchema.partial().describe('Payload for partially updating a product.')

export type CreateProductInput = z.infer<typeof createProductSchema>
export type ProductFilterInput = z.infer<typeof productFilterSchema>
export type ExtractProductInfoInput = z.infer<typeof extractProductInfoSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
