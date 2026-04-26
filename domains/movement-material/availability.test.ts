import { getAllowedMovementsForPose } from './availability'

describe('getAllowedMovementsForPose', () => {
  const generalMovement = {
    id: 'general-1',
    isGeneral: true,
    poseIds: [],
  }

  const poseSpecificMovement = {
    id: 'pose-1',
    isGeneral: false,
    poseIds: ['pose-a'],
  }

  const otherPoseMovement = {
    id: 'pose-2',
    isGeneral: false,
    poseIds: ['pose-b'],
  }

  it('returns both general and pose-specific movements for a pose', () => {
    const result = getAllowedMovementsForPose(
      [generalMovement, poseSpecificMovement, otherPoseMovement],
      'pose-a'
    )

    expect(result.map((movement) => movement.id)).toEqual(['general-1', 'pose-1'])
  })

  it('returns only general movements when a pose has no special mappings', () => {
    const result = getAllowedMovementsForPose(
      [generalMovement, poseSpecificMovement],
      'pose-c'
    )

    expect(result.map((movement) => movement.id)).toEqual(['general-1'])
  })

  it('returns all movements when no pose is selected', () => {
    const result = getAllowedMovementsForPose(
      [generalMovement, poseSpecificMovement, otherPoseMovement],
      null
    )

    expect(result.map((movement) => movement.id)).toEqual(['general-1', 'pose-1', 'pose-2'])
  })
})
