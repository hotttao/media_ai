import { buildGeneratedImagePrompt } from './image-prompt'

describe('buildGeneratedImagePrompt', () => {
  it('joins prompt fragments and trims blanks', () => {
    expect(
      buildGeneratedImagePrompt('  bright studio  ', '', ' subject centered ')
    ).toBe('bright studio, subject centered')
  })

  it('returns null when every fragment is blank', () => {
    expect(buildGeneratedImagePrompt(undefined, '   ', null)).toBeNull()
  })
})
