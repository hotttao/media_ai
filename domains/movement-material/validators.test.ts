import {
  createMovementMaterialSchema,
  updateMovementMaterialSchema,
} from './validators'

describe('movement material validators', () => {
  it('rejects create payloads when both content and url are missing', () => {
    const result = createMovementMaterialSchema.safeParse({
      content: '   ',
      url: '   ',
    })

    expect(result.success).toBe(false)
  })

  it('accepts create payloads with only content', () => {
    const result = createMovementMaterialSchema.safeParse({
      content: 'turn around and show the back',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.content).toBe('turn around and show the back')
      expect(result.data.url).toBeUndefined()
    }
  })

  it('accepts create payloads with only url', () => {
    const result = createMovementMaterialSchema.safeParse({
      content: '   ',
      url: 'https://example.com/action.mp4',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.content).toBeUndefined()
      expect(result.data.url).toBe('https://example.com/action.mp4')
    }
  })

  it('rejects special create payloads without any pose mappings', () => {
    const result = createMovementMaterialSchema.safeParse({
      content: 'turn to the side and look back',
      isGeneral: false,
      poseIds: [],
    })

    expect(result.success).toBe(false)
  })

  it('normalizes general create payloads to drop pose mappings', () => {
    const result = createMovementMaterialSchema.safeParse({
      content: 'walk forward naturally',
      isGeneral: true,
      poseIds: ['pose-a'],
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.poseIds).toEqual([])
    }
  })

  it('rejects update payloads when both content and url are blank', () => {
    const result = updateMovementMaterialSchema.safeParse({
      content: ' ',
      url: '',
    })

    expect(result.success).toBe(false)
  })

  it('rejects special update payloads without any pose mappings', () => {
    const result = updateMovementMaterialSchema.safeParse({
      content: 'keep spinning',
      isGeneral: false,
      poseIds: [],
    })

    expect(result.success).toBe(false)
  })

  it('keeps update payloads partial when scope flags are omitted', () => {
    const result = updateMovementMaterialSchema.safeParse({
      content: 'small shoulder turn',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.isGeneral).toBeUndefined()
      expect(result.data.poseIds).toBeUndefined()
    }
  })
})
