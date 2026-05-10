// domains/combination/engine/CombinationEngine.ts

import {
  ICombinationEngine,
  Combination,
  CombinationConfig,
  CombinationResult,
  CombinationStats,
  CombinationType,
  Constraint,
  ConstraintType,
  GenerationPath,
  MaterialPool,
  Movement,
  Pose
} from '../types'
import { ConstraintRegistry } from './ConstraintRegistry'
import { MaterialPoolProvider } from './MaterialPoolProvider'

export class CombinationEngine implements ICombinationEngine {
  private registry: ConstraintRegistry
  private poolProvider: MaterialPoolProvider

  constructor(registry: ConstraintRegistry, poolProvider: MaterialPoolProvider) {
    this.registry = registry
    this.poolProvider = poolProvider
  }

  async compute(
    productId: string,
    ipId: string,
    config: CombinationConfig
  ): Promise<CombinationResult> {
    // 1. 获取适用的约束
    const applicableConstraints = this.registry.getAllApplicable(productId, ipId)

    // 2. 获取素材池
    const rawPool = await this.poolProvider.getPool(productId, ipId)

    // 3. 应用约束过滤素材
    const filteredPool = this.applyConstraints(rawPool, applicableConstraints)

    // 4. 获取已存在的组合
    const existingCombinations = await this.poolProvider.getExistingCombinations(
      productId, ipId, config.type, config.generationPath
    )

    // 5. 生成理论组合
    const allCombinations = this.generateCombinations(filteredPool, config)

    // 6. 标记已存在的组合
    const combinations = this.markExisting(allCombinations, existingCombinations)

    // 7. 计算统计
    const stats = this.computeStats(combinations, existingCombinations)

    return {
      combinations,
      stats,
      appliedConstraints: applicableConstraints
    }
  }

  private applyConstraints(pool: MaterialPool, constraints: Constraint[]): MaterialPool {
    let filtered = { ...pool }

    for (const constraint of constraints) {
      switch (constraint.type) {
        case ConstraintType.POSE:
          filtered.poses = filtered.poses.filter(p =>
            constraint.allowedValues.includes(p.id)
          )
          break

        case ConstraintType.MOVEMENT:
          filtered.movements = this.filterMovements(
            filtered.movements,
            filtered.poses,
            constraint
          )
          break

        case ConstraintType.SCENE:
          filtered.scenes = filtered.scenes.filter(s =>
            constraint.allowedValues.includes(s.id)
          )
          break

        // 其他约束类型暂不处理
      }
    }

    return filtered
  }

  private filterMovements(
    movements: Movement[],
    poses: Pose[],
    movementConstraint: Constraint
  ): Movement[] {
    const allowedMovementIds = new Set(movementConstraint.allowedValues)
    const poseIds = new Set(poses.map(p => p.id))

    return movements.filter(m => {
      // 不在允许列表中的 movement 直接排除
      if (!allowedMovementIds.has(m.id)) return false

      // 如果是通用动作，直接允许
      if (m.isGeneral) return true

      // 如果是 pose-specific 动作，检查是否与当前 pose 列表兼容
      return m.poseIds.some(pid => poseIds.has(pid))
    })
  }

  private generateCombinations(pool: MaterialPool, config: CombinationConfig): Combination[] {
    switch (config.type) {
      case CombinationType.MODEL_IMAGE:
        return this.generateModelImageCombinations(pool)
      case CombinationType.STYLE_IMAGE:
        return this.generateStyleImageCombinations(pool)
      case CombinationType.FIRST_FRAME:
        return this.generateFirstFrameCombinations(pool, config.generationPath)
      case CombinationType.VIDEO:
        return this.generateVideoCombinations(pool)
    }
  }

  private generateModelImageCombinations(pool: MaterialPool): Combination[] {
    const combinations: Combination[] = []

    // 如果已有 modelImage 记录，基于这些生成组合
    if (pool.modelImages.length > 0) {
      for (const modelImage of pool.modelImages) {
        combinations.push({
          id: `model_${modelImage.id}`,
          type: CombinationType.MODEL_IMAGE,
          elements: { modelImageId: modelImage.id, productId: modelImage.productId, ipId: modelImage.ipId },
          status: 'pending'
        })
      }
    } else {
      // 没有记录时，基于 IP 和 Product 生成待生成组合（用于首次生成）
      combinations.push({
        id: `model_pending_${pool.ipId}_${pool.productId}`,
        type: CombinationType.MODEL_IMAGE,
        elements: { modelImageId: '', productId: pool.productId, ipId: pool.ipId },
        status: 'pending'
      })
    }

    return combinations
  }

  private generateStyleImageCombinations(pool: MaterialPool): Combination[] {
    const combinations: Combination[] = []

    if (pool.modelImages.length > 0) {
      for (const modelImage of pool.modelImages) {
        for (const pose of pool.poses) {
          combinations.push({
            id: this.generateCombinationId({
              modelImageId: modelImage.id,
              poseId: pose.id
            }),
            type: CombinationType.STYLE_IMAGE,
            elements: {
              modelImageId: modelImage.id,
              poseId: pose.id
            },
            status: 'pending'
          })
        }
      }
    } else {
      // 无已有记录时，基于 IP+Product 生成待生成组合
      for (const pose of pool.poses) {
        combinations.push({
          id: this.generateCombinationId({
            modelImageId: '',
            poseId: pose.id
          }),
          type: CombinationType.STYLE_IMAGE,
          elements: {
            modelImageId: '',
            poseId: pose.id,
            productId: pool.productId,
            ipId: pool.ipId
          },
          status: 'pending'
        })
      }
    }

    return combinations
  }

  private generateFirstFrameCombinations(pool: MaterialPool, generationPath?: GenerationPath): Combination[] {
    const combinations: Combination[] = []

    if (pool.styleImages.length > 0) {
      for (const styleImage of pool.styleImages) {
        for (const scene of pool.scenes) {
          combinations.push({
            id: this.generateCombinationId({
              styleImageId: styleImage.id,
              sceneId: scene.id,
              generationPath: generationPath || GenerationPath.GPT
            }),
            type: CombinationType.FIRST_FRAME,
            elements: {
              styleImageId: styleImage.id,
              sceneId: scene.id,
              generationPath: generationPath || GenerationPath.GPT,
              productId: pool.productId,
              ipId: pool.ipId
            },
            status: 'pending'
          })
        }
      }
    } else {
      // 无已有定妆图时，基于 IP+Product 生成待生成组合
      for (const scene of pool.scenes) {
        combinations.push({
          id: this.generateCombinationId({
            styleImageId: '',
            sceneId: scene.id,
            generationPath: generationPath || GenerationPath.GPT
          }),
          type: CombinationType.FIRST_FRAME,
          elements: {
            styleImageId: '',
            sceneId: scene.id,
            generationPath: generationPath || GenerationPath.GPT,
            productId: pool.productId,
            ipId: pool.ipId
          },
          status: 'pending'
        })
      }
    }

    return combinations
  }

  private generateVideoCombinations(pool: MaterialPool): Combination[] {
    const combinations: Combination[] = []

    // 1. 获取有效的 pose-movement 映射
    const poseMovementMap = this.getPoseMovementMap(pool.poses, pool.movements)

    // 2. 遍历每个 pose 及其关联的 movements
    for (const [poseId, movements] of Object.entries(poseMovementMap)) {
      for (const movement of movements) {
        // 3. 与每个 scene、styleImage 组合
        for (const scene of pool.scenes) {
          for (const styleImage of pool.styleImages) {
            combinations.push({
              id: this.generateCombinationId({
                poseId,
                movementId: movement.id,
                sceneId: scene.id,
                styleImageId: styleImage.id
              }),
              type: CombinationType.VIDEO,
              elements: {
                poseId,
                movementId: movement.id,
                sceneId: scene.id,
                styleImageId: styleImage.id
              },
              status: 'pending'
            })
          }
        }
      }
    }

    return combinations
  }

  private getPoseMovementMap(
    poses: Pose[],
    movements: Movement[]
  ): Record<string, Movement[]> {
    const result: Record<string, Movement[]> = {}

    // 初始化每个 pose 的 movement 列表
    for (const pose of poses) {
      result[pose.id] = []
    }

    // 将 movements 分配到对应的 pose
    for (const movement of movements) {
      if (movement.isGeneral) {
        // 通用动作：添加到所有 pose
        for (const pose of poses) {
          result[pose.id].push(movement)
        }
      } else {
        // pose-specific 动作：只添加到关联的 pose
        for (const poseId of movement.poseIds) {
          if (result[poseId]) {
            result[poseId].push(movement)
          }
        }
      }
    }

    return result
  }

  private markExisting(
    combinations: Combination[],
    existing: Combination[]
  ): Combination[] {
    const existingMap = new Map(
      existing.map(e => [this.getCombinationKey(e.elements), e])
    )

    return combinations.map(c => {
      const key = this.getCombinationKey(c.elements)
      const existingRecord = existingMap.get(key)

      if (existingRecord) {
        return {
          ...c,
          status: existingRecord.status,
          existingRecordId: existingRecord.existingRecordId
        }
      }
      return c
    })
  }

  private computeStats(
    combinations: Combination[],
    existingCombinations: Combination[]
  ): CombinationStats {
    const total = combinations.length
    const generated = existingCombinations.length
    const qualified = existingCombinations.filter(c =>
      c.status === 'qualified' || c.status === 'published'
    ).length
    const published = existingCombinations.filter(c =>
      c.status === 'published'
    ).length
    const pending = qualified - published
    const newGeneratable = Math.max(0, total - generated)

    return { total, generated, qualified, published, pending, newGeneratable }
  }

  private generateCombinationId(elements: Record<string, string>): string {
    const parts = Object.keys(elements).sort()
      .map(k => `${k}:${elements[k]}`)
    .filter(p => p.includes(':')) // 过滤空值
    return parts.join('|')
  }

  private getCombinationKey(elements: Combination['elements']): string {
    return this.generateCombinationId(elements as Record<string, string>)
  }
}