import { z } from 'zod'

const dateTimeSchema = z.string().datetime().describe('ISO 8601 date-time string.')
const nullableStringSchema = z.string().nullable()
const nullableNumberSchema = z.union([z.number(), z.string()]).nullable()

export const errorResponseSchema = z.object({
  error: z.string(),
  details: z.unknown().optional(),
}).describe('Standard error response.')

export const successResponseSchema = z.object({
  success: z.boolean(),
}).describe('Standard success response.')

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  nickname: nullableStringSchema,
  teamId: nullableStringSchema,
  role: z.enum(['ADMIN', 'MEMBER']),
  createdAt: dateTimeSchema.optional(),
  updatedAt: dateTimeSchema.optional(),
}).describe('User account returned by the API.')

export const registerResponseSchema = z.object({
  user: userResponseSchema.pick({
    id: true,
    email: true,
    nickname: true,
    teamId: true,
    role: true,
  }),
}).describe('Registration response.')

export const csrfResponseSchema = z.object({
  csrfToken: z.string(),
}).describe('NextAuth CSRF token response.')

export const credentialsLoginResponseSchema = z.object({
  url: z.string().nullable().optional(),
}).passthrough().describe('NextAuth credentials login response.')

export const inviteCodeResponseSchema = z.object({
  id: z.string(),
  teamId: z.string().optional(),
  code: z.string(),
  used: z.boolean().optional(),
  usedBy: nullableStringSchema.optional(),
  teamName: z.string().optional(),
  expiresAt: dateTimeSchema,
  createdAt: dateTimeSchema.optional(),
}).describe('Team invite code.')

export const virtualIpResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  teamId: z.string(),
  nickname: z.string(),
  avatarUrl: nullableStringSchema,
  fullBodyUrl: nullableStringSchema,
  threeViewUrl: nullableStringSchema,
  nineViewUrl: nullableStringSchema,
  age: z.number().int().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).nullable(),
  height: nullableNumberSchema,
  weight: nullableNumberSchema,
  bust: nullableNumberSchema,
  waist: nullableNumberSchema,
  hip: nullableNumberSchema,
  education: nullableStringSchema,
  major: nullableStringSchema,
  city: nullableStringSchema,
  occupation: nullableStringSchema,
  basicSetting: nullableStringSchema,
  personality: nullableStringSchema,
  catchphrase: nullableStringSchema,
  smallHabit: nullableStringSchema,
  familyBackground: nullableStringSchema,
  incomeLevel: nullableStringSchema,
  hobbies: nullableStringSchema,
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
}).describe('Virtual IP character.')

export const materialResponseSchema = z.object({
  id: z.string(),
  userId: nullableStringSchema,
  teamId: nullableStringSchema,
  visibility: z.enum(['PUBLIC', 'PERSONAL', 'TEAM']),
  type: z.enum(['SCENE', 'POSE', 'MAKEUP', 'ACCESSORY', 'OTHER']),
  name: z.string(),
  description: nullableStringSchema,
  url: z.string(),
  tags: nullableStringSchema,
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
}).describe('Material asset.')

export const ipMaterialResponseSchema = z.object({
  id: z.string(),
  ipId: z.string(),
  userId: z.string(),
  type: z.enum(['MAKEUP', 'ACCESSORY', 'CUSTOMIZED_CLOTHING']),
  name: z.string(),
  description: nullableStringSchema,
  tags: nullableStringSchema,
  fullBodyUrl: nullableStringSchema,
  threeViewUrl: nullableStringSchema,
  nineViewUrl: nullableStringSchema,
  materialId: nullableStringSchema,
  sourceIpMaterialId: nullableStringSchema,
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
}).describe('Material associated with a virtual IP.')

export const productImageResponseSchema = z.object({
  id: z.string(),
  productId: z.string(),
  url: z.string(),
  isMain: z.boolean(),
  order: z.number().int(),
}).describe('Product image.')

export const productResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  teamId: z.string(),
  name: z.string(),
  targetAudience: z.enum(['MENS', 'WOMENS', 'KIDS']),
  productDetails: nullableStringSchema,
  displayActions: nullableStringSchema,
  tags: nullableStringSchema,
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
  images: z.array(productImageResponseSchema).optional(),
}).describe('Product.')

export const modelImageResponseSchema = z.object({
  id: z.string(),
  productId: z.string(),
  ipId: z.string(),
  url: z.string(),
  inputHash: z.string(),
  createdAt: dateTimeSchema,
}).describe('Generated model image.')

export const modelImageSaveResponseSchema = z.object({
  modelImageUrl: z.string(),
  modelImageId: z.string(),
}).describe('Saved model image response.')

export const styleImageResponseSchema = z.object({
  id: z.string(),
  productId: z.string(),
  ipId: z.string(),
  modelImageId: z.string(),
  url: z.string(),
  poseId: nullableStringSchema,
  makeupId: nullableStringSchema,
  accessoryId: nullableStringSchema,
  inputHash: z.string(),
  createdAt: dateTimeSchema,
}).describe('Generated styled image.')

export const styleImageSaveResponseSchema = z.object({
  styledImageUrl: z.string(),
  styleImageId: z.string(),
}).describe('Saved styled image response.')

export const firstFrameResponseSchema = z.object({
  id: z.string(),
  productId: z.string(),
  ipId: z.string(),
  styleImageId: nullableStringSchema,
  url: z.string(),
  sceneId: nullableStringSchema,
  composition: nullableStringSchema,
  inputHash: z.string(),
  createdAt: dateTimeSchema,
}).describe('Generated first frame.')

export const firstFrameSaveResponseSchema = z.object({
  firstFrameUrl: z.string(),
  firstFrameId: z.string(),
}).describe('Saved first frame response.')

export const generatedMaterialsResponseSchema = z.object({
  modelImages: z.array(modelImageResponseSchema),
  styleImages: z.array(styleImageResponseSchema),
  firstFrames: z.array(firstFrameResponseSchema),
}).describe('Generated product materials grouped by type.')

export const videoTaskResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  teamId: z.string(),
  workflowId: z.string(),
  ipId: nullableStringSchema,
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']),
  params: nullableStringSchema,
  result: nullableStringSchema,
  error: nullableStringSchema,
  startedAt: dateTimeSchema.nullable(),
  completedAt: dateTimeSchema.nullable(),
  createdAt: dateTimeSchema,
}).describe('Video generation task.')

export const workflowResponseSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: nullableStringSchema,
  version: z.string(),
  config: nullableStringSchema,
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
}).describe('Executable workflow.')

export const movementResponseSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  name: z.string().optional(),
  description: nullableStringSchema.optional(),
  createdAt: dateTimeSchema.optional(),
  updatedAt: dateTimeSchema.optional(),
}).passthrough().describe('Movement.')

export const movementMaterialResponseSchema = z.object({
  id: z.string(),
  url: nullableStringSchema,
  content: z.string(),
  clothing: nullableStringSchema,
  scope: nullableStringSchema,
  createdAt: dateTimeSchema,
}).describe('Movement material.')

export const uploadResponseSchema = z.object({
  url: z.string(),
  fileName: z.string().optional(),
  originalName: z.string().optional(),
}).passthrough().describe('Uploaded file response.')

export const generationJobResponseSchema = z.object({
  taskId: z.string().optional(),
  status: z.string().optional(),
  imageUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  result: z.unknown().optional(),
}).passthrough().describe('External generation job response.')
