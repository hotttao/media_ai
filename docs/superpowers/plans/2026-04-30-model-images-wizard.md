# 模特图生成向导实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现产品详情页的生图向导入口和模特图生成向导页面

**Architecture:**
- 新建向导页面：`/products/[id]/model-images-wizard`
- 在产品详情页添加入口按钮
- 复用水印组合 API 获取数据

**Tech Stack:** Next.js App Router, React, TypeScript

---

## 文件结构

```
新建:
- app/(app)/products/[id]/model-images-wizard/page.tsx

修改:
- app/(app)/products/[id]/ProductDetail.tsx  # 添加生图向导按钮
```

---

## Task 1: 创建模特图生成向导页面

**Files:**
- Create: `app/(app)/products/[id]/model-images-wizard/page.tsx`

- [ ] **Step 1: 创建向导页面组件**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn, getImageUrl } from '@/foundation/lib/utils'

interface IpOption {
  id: string
  nickname: string
  fullBodyUrl: string | null
}

interface ProductOption {
  id: string
  name: string
  mainImageUrl: string | null
}

interface ModelImageCombination {
  id: string
  ip: IpOption
  product: ProductOption
  existingModelImageId: string | null
}

export default function ModelImagesWizardPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string

  const [loading, setLoading] = useState(true)
  const [combinations, setCombinations] = useState<ModelImageCombination[]>([])
  const [selectedIpId, setSelectedIpId] = useState<string | null>(null)
  const [selectedCombinations, setSelectedCombinations] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetch('/api/tools/combination/model-images')
      .then(res => res.json())
      .then((data: ModelImageCombination[]) => {
        setCombinations(data)
        // 默认选中第一个 IP
        if (data.length > 0 && !selectedIpId) {
          setSelectedIpId(data[0].ip.id)
        }
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  // IP 去重
  const ips = Array.from(
    new Map(combinations.map(c => [c.ip.id, c.ip])).values()
  )

  // 当前 IP 下的产品组合
  const currentCombinations = selectedIpId
    ? combinations.filter(c => c.ip.id === selectedIpId)
    : []

  // 待生成组合（未选中的）
  const pendingCombinations = currentCombinations.filter(c => !c.existingModelImageId)
  const generatedCombinations = currentCombinations.filter(c => c.existingModelImageId)

  // 全选/取消全选待生成组合
  const handleSelectAll = () => {
    if (selectedCombinations.size === pendingCombinations.length) {
      // 取消全选
      setSelectedCombinations(new Set())
    } else {
      // 全选待生成组合
      setSelectedCombinations(new Set(pendingCombinations.map(c => c.id)))
    }
  }

  // 切换选择
  const toggleSelection = (id: string) => {
    setSelectedCombinations(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // 生成
  const handleGenerate = async () => {
    if (selectedCombinations.size === 0) return

    setGenerating(true)
    try {
      const results: { success: boolean; id: string }[] = []

      for (const comboId of selectedCombinations) {
        const combo = combinations.find(c => c.id === comboId)
        if (!combo) continue

        const res = await fetch('/api/tools/combination/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'model-image',
            ipId: combo.ip.id,
            productId: combo.product.id,
          }),
        })

        results.push({ success: res.ok, id: comboId })
      }

      const failed = results.filter(r => !r.success)
      if (failed.length > 0) {
        alert(`生成完成，${failed.length} 个失败`)
      } else {
        alert('已提交生成任务')
      }
      window.location.reload()
    } catch (err) {
      console.error(err)
      alert('生成失败')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-100 via-background to-fuchsia-100 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-background to-fuchsia-100">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* 返回按钮和标题 */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-500 hover:text-violet-600 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">返回</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">模特图生成向导</h1>
        </div>

        {/* IP 选择 */}
        <div className="mb-6 rounded-xl border border-oat bg-white shadow-clay p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">选择虚拟IP</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {ips.map(ip => (
              <button
                key={ip.id}
                onClick={() => {
                  setSelectedIpId(ip.id)
                  setSelectedCombinations(new Set())
                }}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all flex-shrink-0',
                  selectedIpId === ip.id
                    ? 'border-matcha-600 bg-matcha-50'
                    : 'border-oat hover:border-matcha-600'
                )}
              >
                {ip.fullBodyUrl ? (
                  <img src={getImageUrl(ip.fullBodyUrl)} alt={ip.nickname} className="h-16 w-16 rounded-lg object-cover" />
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-oat flex items-center justify-center text-sm text-warm-silver">无图</div>
                )}
                <span className="text-sm font-medium">{ip.nickname}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 组合列表 */}
        <div className="rounded-xl border border-oat bg-white shadow-clay">
          {/* 表头 */}
          <div className="flex items-center justify-between border-b border-oat px-4 py-3">
            <h3 className="text-sm font-semibold">组合列表</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={pendingCombinations.length === 0}
              >
                {selectedCombinations.size === pendingCombinations.length ? '取消全选' : '全选'}
              </Button>
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={selectedCombinations.size === 0 || generating}
                className="bg-matcha-600 hover:bg-matcha-500"
              >
                {generating ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    生成中...
                  </>
                ) : (
                  <>生成 ({selectedCombinations.size})</>
                )}
              </Button>
            </div>
          </div>

          {/* 列表内容 */}
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            {currentCombinations.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                暂无可用组合
              </div>
            ) : (
              <div className="space-y-2">
                {/* 待生成 */}
                {pendingCombinations.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-warm-silver mb-2">待生成 ({pendingCombinations.length})</p>
                    {pendingCombinations.map(combo => (
                      <div
                        key={combo.id}
                        className={cn(
                          'flex items-center justify-between rounded-lg border px-3 py-2 cursor-pointer transition-all',
                          selectedCombinations.has(combo.id)
                            ? 'border-matcha-600 bg-matcha-50'
                            : 'border-oat hover:border-matcha-400'
                        )}
                        onClick={() => toggleSelection(combo.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-5 h-5 rounded border flex items-center justify-center',
                            selectedCombinations.has(combo.id)
                              ? 'bg-matcha-600 border-matcha-600'
                              : 'border-gray-300'
                          )}>
                            {selectedCombinations.has(combo.id) && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          {combo.product.mainImageUrl && (
                            <img
                              src={getImageUrl(combo.product.mainImageUrl)}
                              alt={combo.product.name}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          )}
                          <span className="text-sm font-medium">{combo.product.name}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">待生成</Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* 已生成 */}
                {generatedCombinations.length > 0 && (
                  <div>
                    <p className="text-xs text-warm-silver mb-2">已生成 ({generatedCombinations.length})</p>
                    {generatedCombinations.map(combo => (
                      <div
                        key={combo.id}
                        className="flex items-center justify-between rounded-lg border border-matcha-600/30 bg-matcha-50/50 px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded border border-matcha-600/30 bg-matcha-100 flex items-center justify-center">
                            <svg className="w-3 h-3 text-matcha-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          {combo.product.mainImageUrl && (
                            <img
                              src={getImageUrl(combo.product.mainImageUrl)}
                              alt={combo.product.name}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          )}
                          <span className="text-sm font-medium">{combo.product.name}</span>
                        </div>
                        <Badge variant="success" className="text-xs">已生成 ✓</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 底部统计 */}
          <div className="border-t border-oat px-4 py-2">
            <p className="text-xs text-warm-silver">
              已选择 {selectedCombinations.size} / 待生成 {pendingCombinations.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 提交代码**

```bash
git add app/(app)/products/[id]/model-images-wizard/page.tsx
git commit -m "feat: add model-images-wizard page"
```

---

## Task 2: 在产品详情页添加入口按钮

**Files:**
- Modify: `app/(app)/products/[id]/ProductDetail.tsx`

- [ ] **Step 1: 添加生图向导按钮**

在"生成视频"按钮旁边添加一个"生图向导"按钮：

找到第 457-467 行的"生成视频"按钮，在其后面添加：

```tsx
<button
  onClick={() => router.push(`/products/${product.id}/model-images-wizard`)}
  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3.5 font-medium text-white shadow-lg shadow-amber-500/30 transition-all duration-300 hover:from-amber-400 hover:to-orange-500 hover:shadow-amber-500/50 group active:scale-[0.98]"
>
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707m5.656-5.656l-.707-.707m-4.243 12.243l-.707-.707m-5.656 5.656l-.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
  </svg>
  生图向导
</button>
```

- [ ] **Step 2: 提交代码**

```bash
git add app/(app)/products/[id]/ProductDetail.tsx
git commit -m "feat: add model-images-wizard button to product detail page"
```

---

## 验证步骤

1. 启动开发服务器 `npm run dev`
2. 访问产品详情页 `/products/[id]`
3. 检查是否显示"生图向导"按钮
4. 点击按钮进入向导页面
5. 选择 IP，检查组合列表
6. 选择组合，点击生成

---

## 注意事项

- 页面复用了 `/api/tools/combination/model-images` API
- 按钮样式使用了 `from-amber-500 to-orange-600` 渐变，与"生成视频"按钮区分
- 全选逻辑只选择"待生成"的组合，不选择已生成的