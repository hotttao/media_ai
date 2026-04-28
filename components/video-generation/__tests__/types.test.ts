/**
 * types 模块单元测试
 */

import { describe, it, expect } from 'vitest'
import { getCombinationLabels } from '../types'

describe('getCombinationLabels', () => {
  it('returns correct labels for model-image', () => {
    expect(getCombinationLabels('model-image')).toEqual({ a: '虚拟IP', b: '产品' })
  })

  it('returns correct labels for style-image', () => {
    expect(getCombinationLabels('style-image')).toEqual({ a: '姿势', b: '模特图' })
  })

  it('returns correct labels for first-frame', () => {
    expect(getCombinationLabels('first-frame')).toEqual({ a: '场景', b: '定妆图' })
  })
})
