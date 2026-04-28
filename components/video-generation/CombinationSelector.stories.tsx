/**
 * CombinationSelector 使用示例
 *
 * 本组件用于三个场景的两两组合生成：
 * 1. 模特图生成 - 虚拟IP × 产品
 * 2. 定妆图生成 - 模特图 × 姿势
 * 3. 首帧图生成 - 定妆图 × 场景
 */

'use client'

import { useState } from 'react'
import { CombinationSelector } from './CombinationSelector'
import type { SelectableItem, CombinationType } from './types'

// ============ 示例数据 ============

const SAMPLE_POSES: SelectableItem[] = [
  { id: 'pose-1', name: '站立姿势', url: 'https://picsum.photos/seed/pose1/100/100' },
  { id: 'pose-2', name: '行走姿势', url: 'https://picsum.photos/seed/pose2/100/100' },
  { id: 'pose-3', name: '跳跃姿势', url: 'https://picsum.photos/seed/pose3/100/100' },
  { id: 'pose-4', name: '坐姿', url: 'https://picsum.photos/seed/pose4/100/100' },
]

const SAMPLE_MODEL_IMAGES: SelectableItem[] = [
  { id: 'model-1', name: '模特图-A', url: 'https://picsum.photos/seed/model1/100/100' },
  { id: 'model-2', name: '模特图-B', url: 'https://picsum.photos/seed/model2/100/100' },
  { id: 'model-3', name: '模特图-C', url: 'https://picsum.photos/seed/model3/100/100' },
]

// 已存在的组合（用于过滤演示）
const EXISTING_IDS = ['pose-1-model-2', 'pose-2-model-1']

// ============ 示例组件 ============

export function StyleImageGeneratorExample() {
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async (combinations: any[]) => {
    console.log('开始生成:', combinations)
    setGenerating(true)

    // 模拟 API 调用
    for (const combo of combinations) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      console.log(`生成完成: ${combo.itemA.name} × ${combo.itemB.name}`)
    }

    setGenerating(false)
  }

  return (
    <div className="p-6">
      <h2 className="mb-4 text-xl font-semibold">定妆图生成</h2>
      <p className="mb-6 text-sm text-warm-silver">
        选择姿势和模特图，生成两两组合的定妆图。已存在的组合会被标记为灰色。
      </p>

      <CombinationSelector
        type="style-image"
        itemsA={SAMPLE_POSES}
        itemsB={SAMPLE_MODEL_IMAGES}
        existingIds={EXISTING_IDS}
        generating={generating}
        onGenerate={handleGenerate}
      />
    </div>
  )
}

export function ModelImageGeneratorExample() {
  const handleGenerate = (combinations: any[]) => {
    console.log('开始生成模特图:', combinations)
  }

  return (
    <div className="p-6">
      <h2 className="mb-4 text-xl font-semibold">模特图生成</h2>

      <CombinationSelector
        type="model-image"
        itemsA={[
          { id: 'ip-1', name: '虚拟IP-小美', url: 'https://picsum.photos/seed/ip1/100/100' },
          { id: 'ip-2', name: '虚拟IP-小帅', url: 'https://picsum.photos/seed/ip2/100/100' },
        ]}
        itemsB={[
          { id: 'prod-1', name: '产品-连衣裙', url: 'https://picsum.photos/seed/prod1/100/100' },
          { id: 'prod-2', name: '产品-外套', url: 'https://picsum.photos/seed/prod2/100/100' },
          { id: 'prod-3', name: '产品-裤子', url: 'https://picsum.photos/seed/prod3/100/100' },
        ]}
        onGenerate={handleGenerate}
      />
    </div>
  )
}

export function FirstFrameGeneratorExample() {
  const handleGenerate = (combinations: any[]) => {
    console.log('开始生成首帧图:', combinations)
  }

  return (
    <div className="p-6">
      <h2 className="mb-4 text-xl font-semibold">首帧图生成</h2>

      <CombinationSelector
        type="first-frame"
        itemsA={[
          { id: 'scene-1', name: '室内场景', url: 'https://picsum.photos/seed/scene1/100/100' },
          { id: 'scene-2', name: '室外街景', url: 'https://picsum.photos/seed/scene2/100/100' },
          { id: 'scene-3', name: '海边场景', url: 'https://picsum.photos/seed/scene3/100/100' },
        ]}
        itemsB={[
          { id: 'style-1', name: '定妆图-A', url: 'https://picsum.photos/seed/style1/100/100' },
          { id: 'style-2', name: '定妆图-B', url: 'https://picsum.photos/seed/style2/100/100' },
        ]}
        existingIds={['scene-1-style-1']}
        onGenerate={handleGenerate}
      />
    </div>
  )
}
