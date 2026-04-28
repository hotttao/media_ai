import { describe, expect, it } from 'vitest'
import { getVideoTabSummary } from './videos-page-state'

describe('getVideoTabSummary', () => {
  it('reports separate counts for generated videos and pending combinations', () => {
    expect(getVideoTabSummary({ videos: 3, pending: 5 })).toEqual({
      generatedCount: 3,
      pendingCount: 5,
    })
  })
})
