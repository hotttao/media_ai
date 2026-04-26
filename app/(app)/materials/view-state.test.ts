import { getVisibleCollections, type MaterialFilter } from './view-state'

describe('getVisibleCollections', () => {
  const materials = [
    { id: 'scene-1', type: 'SCENE' },
    { id: 'pose-1', type: 'POSE' },
  ]
  const movements = [{ id: 'movement-1' }]

  it('shows only movements in action view', () => {
    const result = getVisibleCollections('ACTION', materials, movements)

    expect(result.materials).toEqual([])
    expect(result.movements).toEqual(movements)
    expect(result.hasVisibleAssets).toBe(true)
    expect(result.primaryActionLabel).toBe('上传动作')
  })

  it('shows an empty action state when there are no movements', () => {
    const result = getVisibleCollections('ACTION', materials, [])

    expect(result.materials).toEqual([])
    expect(result.movements).toEqual([])
    expect(result.hasVisibleAssets).toBe(false)
    expect(result.isActionView).toBe(true)
  })

  it('keeps non-action filters scoped to materials', () => {
    const result = getVisibleCollections('POSE' as MaterialFilter, materials, movements)

    expect(result.materials).toEqual([{ id: 'pose-1', type: 'POSE' }])
    expect(result.movements).toEqual([])
    expect(result.primaryActionLabel).toBe('上传素材')
  })
})
