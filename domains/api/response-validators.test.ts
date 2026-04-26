import {
  firstFrameResponseSchema,
  modelImageResponseSchema,
  styleImageResponseSchema,
} from './response-validators'

describe('generated image response schemas', () => {
  it('accepts prompt on model images', () => {
    const result = modelImageResponseSchema.safeParse({
      id: 'model-1',
      productId: 'product-1',
      ipId: 'ip-1',
      url: 'https://example.com/model.png',
      prompt: 'slim silhouette, front-facing stance',
      inputHash: 'abc123',
      createdAt: '2026-04-26T10:00:00.000Z',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.prompt).toBe('slim silhouette, front-facing stance')
    }
  })

  it('accepts prompt on style and first-frame images', () => {
    const styleResult = styleImageResponseSchema.safeParse({
      id: 'style-1',
      productId: 'product-1',
      ipId: 'ip-1',
      modelImageId: 'model-1',
      url: 'https://example.com/style.png',
      poseId: 'pose-1',
      makeupId: null,
      accessoryId: null,
      prompt: 'half turn pose, one hand on waist',
      inputHash: 'def456',
      createdAt: '2026-04-26T10:00:00.000Z',
    })

    const firstFrameResult = firstFrameResponseSchema.safeParse({
      id: 'frame-1',
      productId: 'product-1',
      ipId: 'ip-1',
      styleImageId: 'style-1',
      url: 'https://example.com/frame.png',
      sceneId: 'scene-1',
      composition: 'subject centered in a clean studio',
      prompt: 'bright studio background, subject centered in a clean studio',
      inputHash: 'ghi789',
      createdAt: '2026-04-26T10:00:00.000Z',
    })

    expect(styleResult.success).toBe(true)
    expect(firstFrameResult.success).toBe(true)
  })
})
