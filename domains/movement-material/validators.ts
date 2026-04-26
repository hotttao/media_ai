import { z } from 'zod'

const optionalTrimmedString = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim()
    return trimmed ? trimmed : undefined
  })

const baseMovementMaterialSchema = z
  .object({
    url: optionalTrimmedString,
    content: optionalTrimmedString,
    clothing: optionalTrimmedString,
    scope: optionalTrimmedString,
    isGeneral: z.boolean().optional(),
    poseIds: z.array(z.string()).optional(),
  })
  .refine((value) => Boolean(value.content || value.url), {
    message: 'Either content or url is required',
    path: ['content'],
  })

function normalizeMovementPayload<T extends { isGeneral?: boolean; poseIds?: string[] }>(value: T) {
  const isGeneral = value.isGeneral ?? true

  return {
    ...value,
    isGeneral,
    poseIds: isGeneral ? [] : value.poseIds ?? [],
  }
}

function hasValidPoseMapping(value: { isGeneral?: boolean; poseIds?: string[] }) {
  if (value.isGeneral !== false) {
    return true
  }

  return Boolean(value.poseIds && value.poseIds.length > 0)
}

function normalizeMovementUpdatePayload<T extends { isGeneral?: boolean; poseIds?: string[] }>(value: T) {
  if (value.isGeneral === true) {
    return {
      ...value,
      poseIds: [],
    }
  }

  return value
}

export const createMovementMaterialSchema = baseMovementMaterialSchema
  .transform(normalizeMovementPayload)
  .refine(hasValidPoseMapping, {
    message: 'Special movements require at least one pose mapping',
    path: ['poseIds'],
  })

export const updateMovementMaterialSchema = baseMovementMaterialSchema
  .transform(normalizeMovementUpdatePayload)
  .refine(hasValidPoseMapping, {
    message: 'Special movements require at least one pose mapping',
    path: ['poseIds'],
  })

export type CreateMovementMaterialInput = z.infer<typeof createMovementMaterialSchema>
export type UpdateMovementMaterialInput = z.infer<typeof updateMovementMaterialSchema>
