export interface PoseAwareMovement {
  id: string
  isGeneral: boolean
  poseIds: string[]
}

export function getAllowedMovementsForPose<T extends PoseAwareMovement>(
  movements: T[],
  poseId: string | null
) {
  if (!poseId) {
    return movements
  }

  return movements.filter((movement) => movement.isGeneral || movement.poseIds.includes(poseId))
}
