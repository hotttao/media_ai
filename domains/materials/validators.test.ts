import { createMaterialSchema, updateMaterialSchema } from './validators'

describe('material validators', () => {
  it('accepts prompt on create payloads', () => {
    const result = createMaterialSchema.safeParse({
      visibility: 'PUBLIC',
      type: 'POSE',
      name: 'Turn Back Pose',
      url: 'https://example.com/pose.png',
      prompt: 'show the back silhouette with one shoulder raised',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.prompt).toBe('show the back silhouette with one shoulder raised')
    }
  })

  it('accepts prompt on update payloads', () => {
    const result = updateMaterialSchema.safeParse({
      prompt: 'highlight the handbag while twisting the waist',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.prompt).toBe('highlight the handbag while twisting the waist')
    }
  })
})
