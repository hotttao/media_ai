import { z } from 'zod'

export const createIpSchema = z.object({
  nickname: z.string().min(1, 'Nickname is required').max(50),
  avatar: z.string().optional(),
  age: z.number().int().min(0).max(150).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  bust: z.number().positive().optional(),
  waist: z.number().positive().optional(),
  hip: z.number().positive().optional(),
  education: z.string().max(50).optional(),
  major: z.string().max(100).optional(),
  personality: z.string().max(200).optional(),
  catchphrase: z.string().max(200).optional(),
  classicAccessories: z.string().max(500).optional(),
  classicActions: z.string().max(500).optional(),
  platforms: z.array(z.object({
    platform: z.string(),
    accountId: z.string(),
  })).optional(),
})

export const updateIpSchema = createIpSchema.partial()

export type CreateIpInput = z.infer<typeof createIpSchema>
export type UpdateIpInput = z.infer<typeof updateIpSchema>