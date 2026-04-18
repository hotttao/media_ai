import { z } from 'zod'

export const createIpSchema = z.object({
  nickname: z.string().min(1, 'Nickname is required').max(50),
  avatarUrl: z.string().optional(),
  fullBodyUrl: z.string().optional(),
  threeViewUrl: z.string().optional(),
  nineViewUrl: z.string().optional(),
  age: z.number().int().min(0).max(150).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  bust: z.number().positive().optional(),
  waist: z.number().positive().optional(),
  hip: z.number().positive().optional(),
  education: z.string().max(50).optional(),
  major: z.string().max(100).optional(),
  city: z.string().max(50).optional(),
  occupation: z.string().max(100).optional(),
  basicSetting: z.string().optional(),
  personality: z.string().max(500).optional(),
  catchphrase: z.string().max(200).optional(),
  smallHabit: z.string().max(500).optional(),
  familyBackground: z.string().optional(),
  incomeLevel: z.string().max(100).optional(),
  hobbies: z.string().max(500).optional(),
})

export const updateIpSchema = createIpSchema.partial()

export type CreateIpInput = z.infer<typeof createIpSchema>
export type UpdateIpInput = z.infer<typeof updateIpSchema>