/**
 * 组合选择器类型定义
 * 用于两两组合生成场景：模特图、定妆图、首帧图
 */

export interface SelectableItem {
  id: string
  name: string
  url?: string
}

export interface GeneratedCombination {
  id: string
  key: string
  itemA: SelectableItem
  itemB: SelectableItem
  status: 'pending' | 'generated' | 'generating' | 'failed'
}

export type CombinationType = 'model-image' | 'style-image' | 'first-frame'

export interface CombinationSelectorProps {
  /** 组合类型 */
  type: CombinationType
  /** A轴选项（如：姿势列表） */
  itemsA: SelectableItem[]
  /** B轴选项（如：模特图列表） */
  itemsB: SelectableItem[]
  /** 已生成的组合ID列表（用于过滤） */
  existingIds?: string[]
  /** 加载状态 */
  loading?: boolean
  /** 生成中 */
  generating?: boolean
  /** 选择变化回调 */
  onSelectionChange?: (selectedA: string[], selectedB: string[]) => void
  /** 生成回调 */
  onGenerate?: (combinations: GeneratedCombination[]) => void
}

/** 根据组合类型获取标签 */
export function getCombinationLabels(type: CombinationType): { a: string; b: string } {
  switch (type) {
    case 'model-image':
      return { a: '虚拟IP', b: '产品' }
    case 'style-image':
      return { a: '姿势', b: '模特图' }
    case 'first-frame':
      return { a: '场景', b: '定妆图' }
  }
}
