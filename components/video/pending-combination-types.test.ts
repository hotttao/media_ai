import { describe, expect, it } from 'vitest'
import { getPendingCombinationTitle } from './pending-combination-types'

describe('getPendingCombinationTitle', () => {
  it('prefers product and movement names for the card title', () => {
    expect(getPendingCombinationTitle({
      product: { id: 'product-1', name: 'White Skirt' },
      movement: { id: 'move-1', content: 'lift skirt' },
    } as any)).toBe('White Skirt · lift skirt')
  })
})
