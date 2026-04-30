// domains/combination/engine/CombinationEngine.test.ts

import { CombinationEngine } from './CombinationEngine'
import { ConstraintRegistry } from './ConstraintRegistry'
import {
  CombinationType,
  ConstraintType,
  ConstraintSubjectType,
  MaterialPool,
  Combination,
  CombinationConfig
} from '../types'
import { MaterialPoolProvider } from './MaterialPoolProvider'

// Mock MaterialPoolProvider
class MockMaterialPoolProvider implements MaterialPoolProvider {
  private pool: MaterialPool
  private existingCombinations: Combination[]

  constructor(pool: MaterialPool, existing: Combination[] = []) {
    this.pool = pool
    this.existingCombinations = existing
  }

  async getPool(productId: string, ipId: string): Promise<MaterialPool> {
    return this.pool
  }

  async getExistingCombinations(
    productId: string,
    ipId: string,
    type: CombinationType
  ): Promise<Combination[]> {
    return this.existingCombinations
  }
}

describe('CombinationEngine', () => {
  const mockPool: MaterialPool = {
    poses: [
      { id: 'pose-1', ipId: 'ip-1', name: 'Pose 1' },
      { id: 'pose-2', ipId: 'ip-1', name: 'Pose 2' }
    ],
    movements: [
      { id: 'mv-1', ipId: 'ip-1', name: 'General Move', content: '', isGeneral: true, poseIds: [] },
      { id: 'mv-2', ipId: 'ip-1', name: 'Pose1 Move', content: '', isGeneral: false, poseIds: ['pose-1'] }
    ],
    scenes: [
      { id: 'scene-1', name: 'Scene 1', url: '' }
    ],
    styleImages: [
      { id: 'style-1', productId: 'prod-1', ipId: 'ip-1', url: '', prompt: '', poseId: 'pose-1', makeupId: '', accessoryId: '' }
    ],
    modelImages: [
      { id: 'model-1', productId: 'prod-1', ipId: 'ip-1', url: '', prompt: '' }
    ]
  }

  let engine: CombinationEngine
  let registry: ConstraintRegistry
  let mockProvider: MockMaterialPoolProvider

  beforeEach(() => {
    registry = new ConstraintRegistry()
    mockProvider = new MockMaterialPoolProvider(mockPool)
    engine = new CombinationEngine(registry, mockProvider as any)
  })

  describe('compute', () => {
    it('generates video combinations with pose-movement mapping', async () => {
      const result = await engine.compute('prod-1', 'ip-1', {
        type: CombinationType.VIDEO
      })

      // pose-1: mv-1 (general) + mv-2 (pose-specific)
      // pose-2: mv-1 (general)
      // 总共: (2 + 1) * 1 scene * 1 style = 3 combinations
      expect(result.combinations).toHaveLength(3)
      expect(result.stats.total).toBe(3)
    })

    it('marks existing combinations as generated', async () => {
      const existing: Combination[] = [
        {
          id: 'existing-1',
          type: CombinationType.VIDEO,
          elements: { poseId: 'pose-1', movementId: 'mv-1', sceneId: 'scene-1', styleImageId: 'style-1' },
          status: 'generated',
          existingRecordId: 'video-1'
        }
      ]

      mockProvider = new MockMaterialPoolProvider(mockPool, existing)
      engine = new CombinationEngine(registry, mockProvider as any)

      const result = await engine.compute('prod-1', 'ip-1', {
        type: CombinationType.VIDEO
      })

      const generatedCombos = result.combinations.filter(c => c.status === 'generated')
      expect(generatedCombos).toHaveLength(1)
      expect(result.stats.generated).toBe(1)
    })

    it('applies movement constraints', async () => {
      registry.register({
        id: 'mv-constraint',
        type: ConstraintType.MOVEMENT,
        subjectType: ConstraintSubjectType.PRODUCT,
        subjectId: 'prod-1',
        allowedValues: ['mv-2'],  // 只允许 pose-specific 动作 mv-2
        priority: 10
      })

      const result = await engine.compute('prod-1', 'ip-1', {
        type: CombinationType.VIDEO
      })

      // mv-2 只关联 pose-1，所以只有 pose-1 有 mv-2
      // 1 * 1 * 1 = 1 个组合
      expect(result.combinations).toHaveLength(1)
      expect(result.combinations[0].elements.poseId).toBe('pose-1')
      expect(result.combinations[0].elements.movementId).toBe('mv-2')
    })

    it('calculates stats correctly', async () => {
      const existing: Combination[] = [
        {
          id: 'existing-1',
          type: CombinationType.VIDEO,
          elements: { poseId: 'pose-1', movementId: 'mv-1', sceneId: 'scene-1', styleImageId: 'style-1' },
          status: 'qualified',
          existingRecordId: 'video-1'
        }
      ]

      mockProvider = new MockMaterialPoolProvider(mockPool, existing)
      engine = new CombinationEngine(registry, mockProvider as any)

      const result = await engine.compute('prod-1', 'ip-1', {
        type: CombinationType.VIDEO
      })

      expect(result.stats.total).toBe(3)
      expect(result.stats.generated).toBe(1)
      expect(result.stats.qualified).toBe(1)
      expect(result.stats.newGeneratable).toBe(2)  // 3 - 1
    })
  })
})