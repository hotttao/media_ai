export type MaterialFilter =
  | 'ALL'
  | 'SCENE'
  | 'POSE'
  | 'MAKEUP'
  | 'ACCESSORY'
  | 'ACTION'
  | 'OTHER'

interface MaterialLike {
  type: string
}

export function getVisibleCollections<TMaterial extends MaterialLike, TMovement>(
  filter: MaterialFilter,
  materials: TMaterial[],
  movements: TMovement[]
) {
  if (filter === 'ACTION') {
    return {
      materials: [] as TMaterial[],
      movements,
      hasVisibleAssets: movements.length > 0,
      isActionView: true,
      primaryActionLabel: '上传动作',
    }
  }

  const visibleMaterials =
    filter === 'ALL'
      ? materials
      : materials.filter((material) => material.type === filter)

  const visibleMovements = filter === 'ALL' ? movements : ([] as TMovement[])

  return {
    materials: visibleMaterials,
    movements: visibleMovements,
    hasVisibleAssets: visibleMaterials.length > 0 || visibleMovements.length > 0,
    isActionView: false,
    primaryActionLabel: '上传素材',
  }
}
