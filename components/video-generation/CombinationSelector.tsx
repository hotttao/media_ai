'use client'

import { useState, useMemo, useCallback } from 'react'
import type {
  SelectableItem,
  GeneratedCombination,
  CombinationType,
} from './types'
import { getCombinationLabels } from './types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/foundation/lib/utils'

/** 单个可选项目的标签 */
function SelectableTag({
  item,
  selected,
  onToggle,
  disabled,
}: {
  item: SelectableItem
  selected: boolean
  onToggle: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-all',
        'hover:-translate-y-0.5 hover:shadow-hard',
        selected
          ? 'border-matcha-600 bg-matcha-600 text-white'
          : 'border-oat bg-white text-foreground hover:border-matcha-600',
        disabled && 'opacity-50 cursor-not-allowed hover:translate-y-0 hover:shadow-none'
      )}
    >
      {item.url && (
        <img src={item.url} alt={item.name} className="h-5 w-5 rounded object-cover" />
      )}
      <span className="font-medium">{item.name}</span>
    </button>
  )
}

/** 多选面板 */
function MultiSelectPanel({
  title,
  items,
  selected,
  onToggle,
  onSelectAll,
  onClearAll,
}: {
  title: string
  items: SelectableItem[]
  selected: Set<string>
  onToggle: (id: string) => void
  onSelectAll: () => void
  onClearAll: () => void
}) {
  return (
    <div className="flex flex-col rounded-xl border border-oat bg-white shadow-clay">
      <div className="flex items-center justify-between border-b border-oat px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSelectAll}
            className="text-xs text-warm-silver hover:text-foreground"
          >
            全选
          </button>
          <span className="text-oat">|</span>
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-warm-silver hover:text-foreground"
          >
            清空
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 p-4">
        {items.length === 0 ? (
          <p className="text-sm text-warm-silver">无可用选项</p>
        ) : (
          items.map((item) => (
            <SelectableTag
              key={item.id}
              item={item}
              selected={selected.has(item.id)}
              onToggle={() => onToggle(item.id)}
            />
          ))
        )}
      </div>
      <div className="border-t border-oat px-4 py-2">
        <p className="text-xs text-warm-silver">
          已选择 {selected.size} / {items.length}
        </p>
      </div>
    </div>
  )
}

/** 组合卡片 */
function CombinationCard({
  combination,
  onRemove,
}: {
  combination: GeneratedCombination
  onRemove?: () => void
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border px-3 py-2',
        combination.status === 'pending' && 'border-oat bg-white',
        combination.status === 'generated' && 'border-matcha-600/30 bg-matcha-50',
        combination.status === 'generating' && 'border-slushie-500/30 bg-slushie-50',
        combination.status === 'failed' && 'border-pomegranate-400/30 bg-pomegranate-50'
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {combination.itemA.url && (
          <img
            src={combination.itemA.url}
            alt={combination.itemA.name}
            className="h-8 w-8 rounded object-cover shrink-0"
          />
        )}
        <span className="text-sm font-medium text-foreground">
          {combination.itemA.name}
        </span>
        <span className="text-warm-silver">×</span>
        {combination.itemB.url && (
          <img
            src={combination.itemB.url}
            alt={combination.itemB.name}
            className="h-8 w-8 rounded object-cover shrink-0"
          />
        )}
        <span className="text-sm font-medium text-foreground">
          {combination.itemB.name}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {combination.status === 'pending' && (
          <Badge variant="secondary" className="text-xs">
            待生成
          </Badge>
        )}
        {combination.status === 'generated' && (
          <Badge variant="success" className="text-xs">
            已存在 ✓
          </Badge>
        )}
        {combination.status === 'generating' && (
          <Badge className="bg-slushie-500 text-xs">生成中...</Badge>
        )}
        {combination.status === 'failed' && (
          <Badge variant="destructive" className="text-xs">
            失败
          </Badge>
        )}
        {onRemove && combination.status === 'pending' && (
          <button
            type="button"
            onClick={onRemove}
            className="text-warm-silver hover:text-pomegranate-400"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

/** 组合预览列表 */
function CombinationList({
  combinations,
  onRemove,
}: {
  combinations: GeneratedCombination[]
  onRemove?: (id: string) => void
}) {
  if (combinations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-oat px-6 py-12">
        <svg className="h-12 w-12 text-oat mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p className="text-sm text-warm-silver">选择两侧选项以生成组合</p>
        <p className="text-xs text-warm-silver/60 mt-1">组合将在此处预览</p>
      </div>
    )
  }

  const pendingCount = combinations.filter((c) => c.status === 'pending').length
  const generatedCount = combinations.filter((c) => c.status === 'generated').length

  return (
    <div className="flex flex-col rounded-xl border border-oat bg-white shadow-clay">
      <div className="flex items-center justify-between border-b border-oat px-4 py-3">
        <h3 className="text-sm font-semibold">生成的组合</h3>
        <div className="flex gap-3">
          {pendingCount > 0 && (
            <span className="text-xs text-warm-silver">
              待生成 <span className="font-medium text-foreground">{pendingCount}</span>
            </span>
          )}
          {generatedCount > 0 && (
            <span className="text-xs text-warm-silver">
              已存在 <span className="font-medium text-matcha-600">{generatedCount}</span>
            </span>
          )}
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto p-4">
        <div className="space-y-2">
          {combinations.map((combo) => (
            <CombinationCard
              key={combo.id}
              combination={combo}
              onRemove={onRemove ? () => onRemove(combo.id) : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/** 组合选择器主组件 */
export function CombinationSelector({
  type,
  itemsA,
  itemsB,
  existingIds = [],
  loading = false,
  generating = false,
  onSelectionChange,
  onGenerate,
}: {
  type: CombinationType
  itemsA: SelectableItem[]
  itemsB: SelectableItem[]
  existingIds?: string[]
  loading?: boolean
  generating?: boolean
  onSelectionChange?: (selectedA: string[], selectedB: string[]) => void
  onGenerate?: (combinations: GeneratedCombination[]) => void
}) {
  const [selectedA, setSelectedA] = useState<Set<string>>(new Set())
  const [selectedB, setSelectedB] = useState<Set<string>>(new Set())
  const labels = getCombinationLabels(type)

  // 计算组合
  const combinations = useMemo<GeneratedCombination[]>(() => {
    const result: GeneratedCombination[] = []
    const existingSet = new Set(existingIds)

    for (const a of itemsA) {
      if (!selectedA.has(a.id)) continue
      for (const b of itemsB) {
        if (!selectedB.has(b.id)) continue
        const key = `${a.id}-${b.id}`
        const id = key // 实际使用时可能需要 hash
        result.push({
          id,
          key,
          itemA: a,
          itemB: b,
          status: existingSet.has(id) ? 'generated' : 'pending',
        })
      }
    }

    return result
  }, [itemsA, itemsB, selectedA, selectedB, existingIds])

  const pendingCombinations = useMemo(
    () => combinations.filter((c) => c.status === 'pending'),
    [combinations]
  )

  const handleToggleA = useCallback((id: string) => {
    setSelectedA((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleToggleB = useCallback((id: string) => {
    setSelectedB((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleSelectAllA = useCallback(() => {
    setSelectedA(new Set(itemsA.map((item) => item.id)))
  }, [itemsA])

  const handleSelectAllB = useCallback(() => {
    setSelectedB(new Set(itemsB.map((item) => item.id)))
  }, [itemsB])

  const handleClearAllA = useCallback(() => {
    setSelectedA(new Set())
  }, [])

  const handleClearAllB = useCallback(() => {
    setSelectedB(new Set())
  }, [])

  const handleRemoveCombination = useCallback((id: string) => {
    // 移除组合的逻辑可以通过重新计算selectedA/selectedB来实现
    // 这里简化处理
  }, [])

  const handleGenerate = useCallback(() => {
    if (onGenerate && pendingCombinations.length > 0) {
      onGenerate(pendingCombinations)
    }
  }, [onGenerate, pendingCombinations])

  // 通知父组件选择变化
  useMemo(() => {
    if (onSelectionChange) {
      onSelectionChange(Array.from(selectedA), Array.from(selectedB))
    }
  }, [selectedA, selectedB, onSelectionChange])

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-oat bg-white px-6 py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-matcha-600 border-t-transparent"></div>
        <span className="ml-3 text-sm text-warm-silver">加载中...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 选择面板 */}
      <div className="grid gap-4 md:grid-cols-2">
        <MultiSelectPanel
          title={labels.a}
          items={itemsA}
          selected={selectedA}
          onToggle={handleToggleA}
          onSelectAll={handleSelectAllA}
          onClearAll={handleClearAllA}
        />
        <MultiSelectPanel
          title={labels.b}
          items={itemsB}
          selected={selectedB}
          onToggle={handleToggleB}
          onSelectAll={handleSelectAllB}
          onClearAll={handleClearAllB}
        />
      </div>

      {/* 组合预览 */}
      <CombinationList
        combinations={combinations}
        onRemove={handleRemoveCombination}
      />

      {/* 生成按钮 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-warm-silver">
          共 <span className="font-medium text-foreground">{combinations.length}</span> 个组合，
          其中 <span className="font-medium text-matcha-600">{combinations.length - pendingCombinations.length}</span> 个已存在
        </p>
        <Button
          onClick={handleGenerate}
          disabled={pendingCombinations.length === 0 || generating}
          className="bg-matcha-600 hover:bg-matcha-500"
        >
          {generating ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              生成中...
            </>
          ) : (
            <>生成 {pendingCombinations.length > 0 && `(${pendingCombinations.length})`}</>
          )}
        </Button>
      </div>
    </div>
  )
}
