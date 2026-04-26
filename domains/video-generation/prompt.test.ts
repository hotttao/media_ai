import { normalizeVideoPrompt } from './prompt'

describe('normalizeVideoPrompt', () => {
  it('defaults missing prompts to an empty string', () => {
    expect(normalizeVideoPrompt()).toBe('')
    expect(normalizeVideoPrompt(null)).toBe('')
  })

  it('trims provided prompts before persistence', () => {
    expect(normalizeVideoPrompt('  cinematic tracking shot  ')).toBe('cinematic tracking shot')
  })
})
