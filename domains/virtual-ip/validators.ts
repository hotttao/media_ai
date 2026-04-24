import { z } from 'zod'

export const createIpSchema = z.object({
  nickname: z.string().min(1, 'Nickname is required').max(50).describe('Display name for the virtual IP character.'),
  avatarUrl: z.string().optional().describe('Avatar image URL.'),
  fullBodyUrl: z.string().optional().describe('Full-body image URL.'),
  threeViewUrl: z.string().optional().describe('Three-view reference image URL.'),
  nineViewUrl: z.string().optional().describe('Nine-view reference image URL.'),
  age: z.number().int().min(0).max(150).optional().describe('Character age in years.'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().describe('Character gender.'),
  height: z.number().positive().optional().describe('Character height.'),
  weight: z.number().positive().optional().describe('Character weight.'),
  bust: z.number().positive().optional().describe('Bust measurement.'),
  waist: z.number().positive().optional().describe('Waist measurement.'),
  hip: z.number().positive().optional().describe('Hip measurement.'),
  education: z.string().max(50).optional().describe('Education background.'),
  major: z.string().max(100).optional().describe('Academic major or specialty.'),
  city: z.string().max(50).optional().describe('City associated with the character.'),
  occupation: z.string().max(100).optional().describe('Occupation or professional role.'),
  basicSetting: z.string().optional().describe('Core background setting for the character.'),
  personality: z.string().max(500).optional().describe('Personality traits and behavior style.'),
  catchphrase: z.string().max(200).optional().describe('Signature phrase or verbal style.'),
  smallHabit: z.string().max(500).optional().describe('Small habits that make the character recognizable.'),
  familyBackground: z.string().optional().describe('Family background or origin story.'),
  incomeLevel: z.string().max(100).optional().describe('Income level or consumption profile.'),
  hobbies: z.string().max(500).optional().describe('Hobbies and interests.'),
}).describe('Payload for creating a virtual IP character.')

export const updateIpSchema = createIpSchema.partial().describe('Payload for partially updating a virtual IP character.')

export type CreateIpInput = z.infer<typeof createIpSchema>
export type UpdateIpInput = z.infer<typeof updateIpSchema>
