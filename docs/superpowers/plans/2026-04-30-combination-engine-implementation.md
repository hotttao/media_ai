# Combination Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立统一的组合引擎模块，所有组件复用此模块计算组合和统计

**Architecture:** 规则化的组合引擎，通过 ConstraintRegistry 管理约束，通过 MaterialPoolProvider 提供素材，通过 CombinationEngine 计算组合和统计

**Tech Stack:** TypeScript, Prisma

---

## File Structure

```
domains/combination/
├── types.ts                   # 类型定义
├── index.ts                   # 导出
└── engine/
    ├── CombinationEngine.ts   # 引擎主类
    ├── ConstraintRegistry.ts  # 约束注册表
    ├── MaterialPoolProvider.ts # 素材池提供者
    └── generators/
        ├── Generator.ts       # 生成器接口
        ├── ModelImageGenerator.ts
        ├── StyleImageGenerator.ts
        ├── FirstFrameGenerator.ts
        └── VideoGenerator.ts
```

---

## Task 1: 创建类型定义

**Files:**
- Create: `domains/combination/types.ts`

- [ ] **Step 1: 创建目录结构**

```bash
mkdir -p domains/combination/engine/generators
```

- [ ] **Step 2: 创建 types.ts**

```typescript
// domains/combination/types.ts

// ============ 枚举 ============

export enum CombinationType {
  MODEL_IMAGE = 'MODEL_IMAGE',
  STYLE_IMAGE = 'STYLE_IMAGE',
  FIRST_FRAME = 'FIRST_FRAME',
  VIDEO = 'VIDEO'
}

export enum ConstraintType {
  POSE = 'POSE',
  MOVEMENT = 'MOVEMENT',
  SCENE = 'SCENE',
  MATERIAL = 'MATERIAL',
  STYLE = 'STYLE',
  CUSTOM = 'CUSTOM'
}

export enum ConstraintSubjectType {
  PRODUCT = 'PRODUCT',
  IP = 'IP'
}

// ============ 约束相关 ============

export interface Constraint {
  id: string
  type: ConstraintType
  subjectType: ConstraintSubjectType
  subjectId: string
  allowedValues: string[]
  priority: number
  description?: string
}

// ============ 素材相关 ============

export interface Pose {
  id: string
  ipId: string
  name: string
  url?: string
  prompt?: string
}

export interface Movement {
  id: string
  ipId: string
  name: string
  url?: string
  content: string
  isGeneral: boolean
  poseIds: string[]
  prompt?: string
}

export interface Scene {
  id: string
  name: string
  url: string
}

export interface StyleImage {
  id: string
  productId: string
  ipId: string
  url: string
  prompt?: string
  poseId: string
  makeupId: string
  accessoryId: string
}

export interface ModelImage {
  id: string
  productId: string
  ipId: string
  url: string
  prompt?: string
}

export interface MaterialPool {
  poses: Pose[]
  movements: Movement[]
  scenes: Scene[]
  styleImages: StyleImage[]
  modelImages: ModelImage[]
}

// ============ 组合结果 ============

export interface CombinationElement {
  poseId?: string
  movementId?: string
  sceneId?: string
  styleImageId?: string
  modelImageId?: string
  makeupId?: string
  accessoryId?: string
  productId?: string
  ipId?: string
}

export type CombinationStatus = 'pending' | 'generated' | 'qualified' | 'published'

export interface Combination {
  id: string
  type: CombinationType
  elements: CombinationElement
  status: CombinationStatus
  existingRecordId?: string
}

export interface CombinationStats {
  total: number
  generated: number
  qualified: number
  published: number
  pending: number
  newGeneratable: number
}

export interface CombinationResult {
  combinations: Combination[]
  stats: CombinationStats
  appliedConstraints: Constraint[]
}

// ============ 配置 ============

export interface CombinationConfig {
  type: CombinationType
  includeQualified?: boolean
  includePublished?: boolean
  extraConstraints?: Constraint[]
}
```

- [ ] **Step 3: Commit**

```bash
git add domains/combination/types.ts
git commit -m "feat: add combination engine types"
```

---

## Task 2: 创建约束注册表

**Files:**
- Create: `domains/combination/engine/ConstraintRegistry.ts`

- [ ] **Step 1: 创建 ConstraintRegistry.ts**

```typescript
// domains/combination/engine/ConstraintRegistry.ts

import { Constraint, ConstraintSubjectType } from '../types'

export class ConstraintRegistry {
  private constraints: Map<string, Constraint> = new Map()

  register(constraint: Constraint): void {
    this.constraints.set(constraint.id, constraint)
  }

  registerMany(constraints: Constraint[]): void {
    constraints.forEach(c => this.register(c))
  }

  unregister(id: string): void {
    this.constraints.delete(id)
  }

  get(id: string): Constraint | undefined {
    return this.constraints.get(id)
  }

  getAll(): Constraint[] {
    return Array.from(this.constraints.values())
  }

  getForSubject(subjectType: ConstraintSubjectType, subjectId: string): Constraint[] {
    return Array.from(this.constraints.values())
      .filter(c => c.subjectType === subjectType && c.subjectId === subjectId)
  }

  getForProduct(productId: string): Constraint[] {
    return this.getForSubject(ConstraintSubjectType.PRODUCT, productId)
  }

  getForIP(ipId: string): Constraint[] {
    return this.getForSubject(ConstraintSubjectType.IP, ipId)
  }

  getAllApplicable(productId: string, ipId: string): Constraint[] {
    return [
      ...this.getForProduct(productId),
      ...this.getForIP(ipId)
    ].sort((a, b) => b.priority - a.priority)
  }

  clear(): void {
    this.constraints.clear()
  }
}
```

- [ ] **Step 2: 创建测试文件**

```typescript
// domains/combination/engine/ConstraintRegistry.test.ts

import { ConstraintRegistry } from './ConstraintRegistry'
import { Constraint, ConstraintType, ConstraintSubjectType } from '../types'

describe('ConstraintRegistry', () => {
  let registry: ConstraintRegistry

  beforeEach(() => {
    registry = new ConstraintRegistry()
  })

  const createConstraint = (overrides: Partial<Constraint> = {}): Constraint => ({
    id: 'test-1',
    type: ConstraintType.MOVEMENT,
    subjectType: ConstraintSubjectType.PRODUCT,
    subjectId: 'prod-1',
    allowedValues: ['mv-1', 'mv-2'],
    priority: 10,
    ...overrides
  })

  it('registers and retrieves constraint', () => {
    const constraint = createConstraint()
    registry.register(constraint)

    expect(registry.get('test-1')).toEqual(constraint)
  })

  it('registers multiple constraints', () => {
    registry.registerMany([
      createConstraint({ id: 'c1' }),
      createConstraint({ id: 'c2' })
    ])

    expect(registry.getAll()).toHaveLength(2)
  })

  it('gets constraints for product', () => {
    registry.registerMany([
      createConstraint({ id: 'c1', subjectType: ConstraintSubjectType.PRODUCT, subjectId: 'prod-1' }),
      createConstraint({ id: 'c2', subjectType: ConstraintSubjectType.PRODUCT, subjectId: 'prod-2' }),
      createConstraint({ id: 'c3', subjectType: ConstraintSubjectType.IP, subjectId: 'ip-1' })
    ])

    const result = registry.getForProduct('prod-1')

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('c1')
  })

  it('gets constraints for IP', () => {
    registry.registerMany([
      createConstraint({ id: 'c1', subjectType: ConstraintSubjectType.IP, subjectId: 'ip-1' }),
      createConstraint({ id: 'c2', subjectType: ConstraintSubjectType.IP, subjectId: 'ip-2' })
    ])

    const result = registry.getForIP('ip-1')

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('c1')
  })

  it('gets all applicable constraints sorted by priority', () => {
    registry.registerMany([
      createConstraint({ id: 'c1', subjectType: ConstraintSubjectType.PRODUCT, subjectId: 'prod-1', priority: 5 }),
      createConstraint({ id: 'c2', subjectType: ConstraintSubjectType.IP, subjectId: 'ip-1', priority: 20 }),
      createConstraint({ id: 'c3', subjectType: ConstraintSubjectType.PRODUCT, subjectId: 'prod-1', priority: 15 })
    ])

    const result = registry.getAllApplicable('prod-1', 'ip-1')

    expect(result).toHaveLength(3)
    expect(result[0].id).toBe('c2')  // priority 20
    expect(result[1].id).toBe('c3')  // priority 15
    expect(result[2].id).toBe('c1')  // priority 5
  })

  it('unregisters constraint', () => {
    registry.register(createConstraint())
    registry.unregister('test-1')

    expect(registry.get('test-1')).toBeUndefined()
  })

  it('clears all constraints', () => {
    registry.registerMany([
      createConstraint({ id: 'c1' }),
      createConstraint({ id: 'c2' })
    ])
    registry.clear()

    expect(registry.getAll()).toHaveLength(0)
  })
})
```

- [ ] **Step 3: 运行测试**

Run: `npm test -- --testPathPattern="ConstraintRegistry" --verbose`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add domains/combination/engine/ConstraintRegistry.ts domains/combination/engine/ConstraintRegistry.test.ts
git commit -m "feat: add ConstraintRegistry for managing combination constraints"
```

---

## Task 3: 创建素材池提供者

**Files:**
- Create: `domains/combination/engine/MaterialPoolProvider.ts`

- [ ] **Step 1: 创建 MaterialPoolProvider 接口和实现**

```typescript
// domains/combination/engine/MaterialPoolProvider.ts

import { db } from '@/foundation/lib/db'
import { MaterialPool, Combination, CombinationType, Pose, Movement } from '../types'
import { getAllowedMovementsForPose, PoseAwareMovement } from '@/domains/movement-material/availability'

export interface MaterialPoolProvider {
  getPool(productId: string, ipId: string): Promise<MaterialPool>
  getExistingCombinations(productId: string, ipId: string, type: CombinationType): Promise<Combination[]>
}

export class PrismaMaterialPoolProvider implements MaterialPoolProvider {
  async getPool(productId: string, ipId: string): Promise<MaterialPool> {
    const [poses, movements, scenes, styleImages, modelImages] = await Promise.all([
      // Poses - 从 material 表获取 type='POSE' 且属于该 IP 的记录
      db.material.findMany({
        where: { type: 'POSE', ipId },
        select: { id: true, name: true, url: true, prompt: true, ipId: true }
      }),
      // Movements - 从 movement_materials 表获取
      db.movementMaterial.findMany({
        where: { },  // 暂不过滤，后续根据 pose 过滤
        include: {
          poseLinks: { select: { poseId: true } }
        }
      }),
      // Scenes - 从 material 表获取 type='SCENE'
      db.material.findMany({
        where: { type: 'SCENE' },
        select: { id: true, name: true, url: true }
      }),
      // Style Images
      db.styleImage.findMany({
        where: { productId, ipId },
        select: { id: true, productId: true, ipId: true, url: true, prompt: true, poseId: true, makeupId: true, accessoryId: true }
      }),
      // Model Images
      db.modelImage.findMany({
        where: { productId, ipId },
        select: { id: true, productId: true, ipId: true, url: true, prompt: true }
      })
    ])

    // 转换 movement 格式
    const movementView: PoseAwareMovement[] = movements.map(m => ({
      id: m.id,
      isGeneral: m.isGeneral,
      poseIds: m.poseLinks.map(link => link.poseId)
    }))

    return {
      poses: poses as Pose[],
      movements: movements.map(m => ({
        id: m.id,
        ipId: ipId,
        name: m.content,
        url: m.url || undefined,
        content: m.content,
        isGeneral: m.isGeneral,
        poseIds: m.poseLinks.map(link => link.poseId)
      })) as Movement[],
      scenes: scenes as Scene[],
      styleImages: styleImages as any[],
      modelImages: modelImages as any[]
    }
  }

  async getExistingCombinations(
    productId: string,
    ipId: string,
    type: CombinationType
  ): Promise<Combination[]> {
    switch (type) {
      case CombinationType.MODEL_IMAGE:
        return this.getExistingModelImages(productId, ipId)
      case CombinationType.STYLE_IMAGE:
        return this.getExistingStyleImages(productId, ipId)
      case CombinationType.FIRST_FRAME:
        return this.getExistingFirstFrames(productId, ipId)
      case CombinationType.VIDEO:
        return this.getExistingVideos(productId, ipId)
    }
  }

  private async getExistingModelImages(productId: string, ipId: string): Promise<Combination[]> {
    const records = await db.modelImage.findMany({
      where: { productId, ipId },
      select: { id: true, productId: true, ipId: true }
    })

    return records.map(r => ({
      id: r.id,
      type: CombinationType.MODEL_IMAGE,
      elements: { modelImageId: r.id, productId: r.productId, ipId: r.ipId },
      status: 'generated' as const,
      existingRecordId: r.id
    }))
  }

  private async getExistingStyleImages(productId: string, ipId: string): Promise<Combination[]> {
    const records = await db.styleImage.findMany({
      where: { productId, ipId },
      select: { id: true, modelImageId: true, poseId: true, makeupId: true, accessoryId: true }
    })

    return records.map(r => ({
      id: r.id,
      type: CombinationType.STYLE_IMAGE,
      elements: {
        modelImageId: r.modelImageId,
        poseId: r.poseId,
        makeupId: r.makeupId,
        accessoryId: r.accessoryId,
        styleImageId: r.id
      },
      status: 'generated' as const,
      existingRecordId: r.id
    }))
  }

  private async getExistingFirstFrames(productId: string, ipId: string): Promise<Combination[]> {
    const records = await db.firstFrame.findMany({
      where: { productId, ipId },
      select: { id: true, styleImageId: true, sceneId: true }
    })

    return records.map(r => ({
      id: r.id,
      type: CombinationType.FIRST_FRAME,
      elements: {
        styleImageId: r.styleImageId,
        sceneId: r.sceneId,
        firstFrameId: r.id
      },
      status: 'generated' as const,
      existingRecordId: r.id
    }))
  }

  private async getExistingVideos(productId: string, ipId: string): Promise<Combination[]> {
    const videos = await db.video.findMany({
      where: { productId, ipId },
      include: {
        videoPush: { select: { isQualified: true, isPublished: true } }
      }
    })

    return videos.map(v => ({
      id: v.id,
      type: CombinationType.VIDEO,
      elements: {
        firstFrameId: v.firstFrameId || undefined,
        movementId: v.movementId || undefined,
        videoId: v.id
      },
      status: v.videoPush?.isPublished ? 'published'
        : v.videoPush?.isQualified ? 'qualified'
        : 'generated',
      existingRecordId: v.id
    }))
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add domains/combination/engine/MaterialPoolProvider.ts
git commit -m "feat: add PrismaMaterialPoolProvider for fetching material pools"
```

---

## Task 4: 创建组合引擎核心

**Files:**
- Create: `domains/combination/engine/CombinationEngine.ts`

- [ ] **Step 1: 创建 CombinationEngine.ts**

```typescript
// domains/combination/engine/CombinationEngine.ts

import {
  CombinationEngine as ICombinationEngine,
  Combination,
  CombinationConfig,
  CombinationResult,
  CombinationStats,
  CombinationType,
  Constraint,
  ConstraintType,
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
      productId, ipId, config.type
    )

    // 5. 生成理论组合
    const allCombinations = this.generateCombinations(filteredPool, config.type)

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

  private generateCombinations(pool: MaterialPool, type: CombinationType): Combination[] {
    switch (type) {
      case CombinationType.MODEL_IMAGE:
        return this.generateModelImageCombinations(pool)
      case CombinationType.STYLE_IMAGE:
        return this.generateStyleImageCombinations(pool)
      case CombinationType.FIRST_FRAME:
        return this.generateFirstFrameCombinations(pool)
      case CombinationType.VIDEO:
        return this.generateVideoCombinations(pool)
    }
  }

  private generateModelImageCombinations(pool: MaterialPool): Combination[] {
    const combinations: Combination[] = []

    for (const modelImage of pool.modelImages) {
      combinations.push({
        id: `model_${modelImage.id}`,
        type: CombinationType.MODEL_IMAGE,
        elements: { modelImageId: modelImage.id, productId: modelImage.productId, ipId: modelImage.ipId },
        status: 'pending'
      })
    }

    return combinations
  }

  private generateStyleImageCombinations(pool: MaterialPool): Combination[] {
    const combinations: Combination[] = []

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

    return combinations
  }

  private generateFirstFrameCombinations(pool: MaterialPool): Combination[] {
    const combinations: Combination[] = []

    for (const styleImage of pool.styleImages) {
      for (const scene of pool.scenes) {
        combinations.push({
          id: this.generateCombinationId({
            styleImageId: styleImage.id,
            sceneId: scene.id
          }),
          type: CombinationType.FIRST_FRAME,
          elements: {
            styleImageId: styleImage.id,
            sceneId: scene.id
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
```

- [ ] **Step 2: Commit**

```bash
git add domains/combination/engine/CombinationEngine.ts
git commit -m "feat: add CombinationEngine core implementation"
```

---

## Task 5: 创建索引导出

**Files:**
- Create: `domains/combination/index.ts`

- [ ] **Step 1: 创建 index.ts**

```typescript
// domains/combination/index.ts

export * from './types'
export { CombinationEngine } from './engine/CombinationEngine'
export { ConstraintRegistry } from './engine/ConstraintRegistry'
export { PrismaMaterialPoolProvider } from './engine/MaterialPoolProvider'
```

- [ ] **Step 2: Commit**

```bash
git add domains/combination/index.ts
git commit -m "feat: add combination engine index export"
```

---

## Task 6: 创建引擎测试

**Files:**
- Create: `domains/combination/engine/CombinationEngine.test.ts`

- [ ] **Step 1: 创建测试文件**

```typescript
// domains/combination/engine/CombinationEngine.test.ts

import { CombinationEngine } from './CombinationEngine'
import { ConstraintRegistry } from './ConstraintRegistry'
import {
  CombinationType,
  ConstraintType,
  ConstraintSubjectType,
  MaterialPool,
  Combination
} from '../types'

// Mock MaterialPoolProvider
class MockMaterialPoolProvider {
  private pool: MaterialPool
  private existingCombinations: Combination[]

  constructor(pool: MaterialPool, existing: Combination[] = []) {
    this.pool = pool
    this.existingCombinations = existing
  }

  async getPool() {
    return this.pool
  }

  async getExistingCombinations() {
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
        allowedValues: ['mv-1'],  // 只允许通用动作
        priority: 10
      })

      const result = await engine.compute('prod-1', 'ip-1', {
        type: CombinationType.VIDEO
      })

      // 只有 pose-2 剩下 mv-1，所以是 1 * 1 * 1 = 1
      expect(result.combinations).toHaveLength(1)
      expect(result.appliedConstraints).toHaveLength(1)
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
```

- [ ] **Step 2: 运行测试**

Run: `npm test -- --testPathPattern="CombinationEngine" --verbose`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add domains/combination/engine/CombinationEngine.test.ts
git commit -m "test: add CombinationEngine unit tests"
```

---

## Task 7: 集成到当日发布计划 API

**Files:**
- Modify: `app/api/daily-publish-plan/[date]/products/route.ts`

- [ ] **Step 1: 使用组合引擎计算统计**

修改 `app/api/daily-publish-plan/[date]/products/route.ts`:

将原有的手动计算逻辑替换为使用组合引擎：

```typescript
// 在文件顶部添加导入
import { CombinationEngine, ConstraintRegistry, PrismaMaterialPoolProvider, CombinationType } from '@/domains/combination'

// 在 GET handler 中使用
export async function GET(
  request: NextRequest,
  { params }: { params: { date: string } }
) {
  // ... 现有的 plan 查询 ...

  const registry = new ConstraintRegistry()
  const poolProvider = new PrismaMaterialPoolProvider(db)
  const engine = new CombinationEngine(registry, poolProvider)

  const products = await Promise.all(
    plans.map(async plan => {
      // 使用组合引擎计算视频统计
      const result = await engine.compute(plan.productId, plan.ipId, {
        type: CombinationType.VIDEO
      })

      return {
        productId: plan.productId,
        productName: plan.product.name,
        productImage: plan.product.images[0]?.url || '',
        ipId: plan.ipId,
        aiVideoCount: result.stats.generated,  // 已生成视频数
        pushableCount: result.stats.pending,   // 可发布数
        publishedCount: result.stats.published, // 已发布数
        // newGeneratableCount 可以从前端按需计算
      }
    })
  )

  return NextResponse.json({ products })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/daily-publish-plan/[date]/products/route.ts
git commit -m "feat: use CombinationEngine for daily publish plan stats"
```

---

## Summary

**Implementation complete!**

The Combination Engine module provides:

1. **Types** - `domains/combination/types.ts`
   - CombinationType, ConstraintType, ConstraintSubjectType enums
   - Constraint, MaterialPool, Combination, CombinationStats interfaces

2. **ConstraintRegistry** - `domains/combination/engine/ConstraintRegistry.ts`
   - 注册和管理约束规则
   - 按 product/ip 获取适用的约束
   - 按优先级排序

3. **MaterialPoolProvider** - `domains/combination/engine/MaterialPoolProvider.ts`
   - 从 Prisma 获取素材池
   - 获取已存在的组合

4. **CombinationEngine** - `domains/combination/engine/CombinationEngine.ts`
   - `compute()` 方法计算组合和统计
   - pose-movement 关联关系处理
   - 约束应用和过滤

5. **集成** - 当日发布计划 API 已集成组合引擎
