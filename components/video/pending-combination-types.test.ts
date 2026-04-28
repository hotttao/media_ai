import { describe, expect, it } from 'vitest'
import { getPendingCombinationTitle, groupByMovement, groupByProduct } from './pending-combination-types'

describe('getPendingCombinationTitle', () => {
  it('prefers product name for the card title', () => {
    expect(getPendingCombinationTitle({
      product: { id: 'product-1', name: 'White Skirt' },
      movement: { id: 'move-1', content: 'lift skirt' },
    } as any)).toBe('White Skirt')
  })

  it('shows 未关联商品 when product is null', () => {
    expect(getPendingCombinationTitle({
      product: null,
      movement: { id: 'move-1', content: 'lift skirt' },
    } as any)).toBe('未关联商品')
  })
})

describe('groupByMovement', () => {
  it('groups items by movement content', () => {
    const items = [
      { combinationKey: '1:a', movement: { content: 'turn around' }, product: { name: 'P1' } } as any,
      { combinationKey: '2:b', movement: { content: 'lift skirt' }, product: { name: 'P1' } } as any,
      { combinationKey: '3:c', movement: { content: 'turn around' }, product: { name: 'P2' } } as any,
    ]
    const result = groupByMovement(items)
    expect(result).toHaveLength(2)
    expect(result.find(g => g.title === 'turn around')?.count).toBe(2)
    expect(result.find(g => g.title === 'lift skirt')?.count).toBe(1)
  })
})

describe('groupByProduct', () => {
  it('groups items by product name', () => {
    const items = [
      { combinationKey: '1:a', movement: { content: 'm1' }, product: { name: 'White Skirt' } } as any,
      { combinationKey: '2:b', movement: { content: 'm2' }, product: { name: 'Black Dress' } } as any,
      { combinationKey: '3:c', movement: { content: 'm3' }, product: { name: 'White Skirt' } } as any,
    ]
    const result = groupByProduct(items)
    expect(result).toHaveLength(2)
    expect(result.find(g => g.title === 'White Skirt')?.count).toBe(2)
    expect(result.find(g => g.title === 'Black Dress')?.count).toBe(1)
  })

  it('groups null product as 未关联商品', () => {
    const items = [
      { combinationKey: '1:a', movement: { content: 'm1' }, product: null } as any,
      { combinationKey: '2:b', movement: { content: 'm2' }, product: { name: 'Dress' } } as any,
    ]
    const result = groupByProduct(items)
    expect(result.find(g => g.title === '未关联商品')?.count).toBe(1)
    expect(result.find(g => g.title === 'Dress')?.count).toBe(1)
  })
})
