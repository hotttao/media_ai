'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getImageUrl } from '@/foundation/lib/utils'

interface IpOption {
  id: string
  nickname: string
  fullBodyUrl?: string
}

interface ProductOption {
  id: string
  name: string
  mainImageUrl?: string
}

interface Combination {
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
  const [combinations, setCombinations] = useState<Combination[]>([])
  const [selectedIpId, setSelectedIpId] = useState<string | null>(null)
  const [selectedCombinations, setSelectedCombinations] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)

  // Initial data fetch
  useEffect(() => {
    fetch('/api/tools/combination/model-images')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then((data: Combination[]) => {
        // Filter to only show combinations for this product
        const filtered = data.filter(c => c.product.id === productId)
        setCombinations(filtered)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [productId])

  // Set initial selected IP once on mount
  useEffect(() => {
    if (!selectedIpId && combinations.length > 0) {
      setSelectedIpId(combinations[0].ip.id)
    }
  }, [selectedIpId, combinations])

  // Get unique IPs from combinations
  const ips = useMemo(() => {
    const ipMap = new Map<string, IpOption>()
    for (const c of combinations) {
      if (!ipMap.has(c.ip.id)) {
        ipMap.set(c.ip.id, c.ip)
      }
    }
    return Array.from(ipMap.values())
  }, [combinations])

  // Get combinations for selected IP
  const combinationsForSelectedIp = useMemo(() => {
    if (!selectedIpId) return []
    return combinations.filter(c => c.ip.id === selectedIpId)
  }, [combinations, selectedIpId])

  // Count statistics
  const stats = useMemo(() => {
    const total = combinationsForSelectedIp.length
    const generated = combinationsForSelectedIp.filter(c => c.existingModelImageId).length
    const pending = total - generated
    return { total, generated, pending }
  }, [combinationsForSelectedIp])

  const handleToggleCombination = (combinationId: string) => {
    setSelectedCombinations(prev => {
      const next = new Set(prev)
      if (next.has(combinationId)) {
        next.delete(combinationId)
      } else {
        next.add(combinationId)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    const pendingIds = combinationsForSelectedIp
      .filter(c => !c.existingModelImageId)
      .map(c => c.id)
    setSelectedCombinations(new Set(pendingIds))
  }

  const handleDeselectAll = () => {
    setSelectedCombinations(new Set())
  }

  const handleGenerate = async () => {
    if (selectedCombinations.size === 0) return

    setGenerating(true)
    try {
      const combos = combinationsForSelectedIp.filter(c => selectedCombinations.has(c.id))
      const failures: string[] = []
      for (const combo of combos) {
        const res = await fetch('/api/tools/combination/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'model-image',
            ipId: combo.ip.id,
            productId: combo.product.id,
          }),
        })
        if (!res.ok) {
          failures.push(combo.ip.nickname)
        }
      }
      if (failures.length > 0) {
        alert(`部分生成失败: ${failures.join(', ')}`)
      } else {
        alert('已提交生成任务')
      }
      // Refresh page to update status
      router.refresh()
    } catch (err) {
      console.error(err)
      alert('生成失败')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-100 via-background to-fuchsia-100">
        <div className="fixed top-20 left-20 w-96 h-96 bg-violet-300/30 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <div
          className="fixed bottom-20 right-20 w-80 h-80 bg-fuchsia-300/30 rounded-full blur-[100px] pointer-events-none animate-pulse"
          style={{ animationDelay: '1s' }}
        />
        <div className="relative max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center rounded-xl border border-oat bg-white px-6 py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-matcha-600 border-t-transparent"></div>
            <span className="ml-3 text-sm text-warm-silver">加载中...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-background to-fuchsia-100">
      {/* Floating orbs */}
      <div className="fixed top-20 left-20 w-96 h-96 bg-violet-300/30 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div
        className="fixed bottom-20 right-20 w-80 h-80 bg-fuchsia-300/30 rounded-full blur-[100px] pointer-events-none animate-pulse"
        style={{ animationDelay: '1s' }}
      />

      <div className="relative max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href={`/products/${productId}`}
            className="w-10 h-10 rounded-xl bg-white shadow-md flex items-center justify-center text-gray-500 hover:text-violet-600 hover:shadow-lg transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-warm-charcoal tracking-tight">模特图生成向导</h1>
            <p className="text-sm text-warm-silver mt-0.5">选择虚拟IP，批量生成模特图</p>
          </div>
        </div>

        {/* IP Selection */}
        <div className="rounded-xl border border-oat bg-white shadow-clay mb-6">
          <div className="border-b border-oat px-4 py-3">
            <h3 className="text-sm font-semibold">选择虚拟IP</h3>
          </div>
          <div className="p-4">
            {ips.length === 0 ? (
              <p className="text-sm text-warm-silver">暂无可用IP</p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {ips.map(ip => (
                  <button
                    key={ip.id}
                    onClick={() => {
                      setSelectedIpId(ip.id)
                      setSelectedCombinations(new Set())
                    }}
                    className={`
                      flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all flex-shrink-0
                      ${selectedIpId === ip.id
                        ? 'border-matcha-600 bg-matcha-50'
                        : 'border-oat hover:border-matcha-600'
                      }
                    `}
                  >
                    {ip.fullBodyUrl ? (
                      <img
                        src={getImageUrl(ip.fullBodyUrl)}
                        alt={ip.nickname}
                        className="h-20 w-20 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-oat text-sm text-warm-silver">
                        无图片
                      </div>
                    )}
                    <span className="text-sm font-medium">{ip.nickname}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Combination Table */}
        <div className="rounded-xl border border-oat bg-white shadow-clay">
          <div className="flex items-center justify-between border-b border-oat px-4 py-3">
            <h3 className="text-sm font-semibold">
              IP × 产品 组合
              {selectedIpId && (
                <span className="ml-2 text-warm-silver font-normal">
                  ({ips.find(ip => ip.id === selectedIpId)?.nickname || ''})
                </span>
              )}
            </h3>
            <div className="flex items-center gap-4 text-xs text-warm-silver">
              <span>
                已生成 <span className="font-medium text-matcha-600">{stats.generated}</span>
              </span>
              <span>
                待生成 <span className="font-medium text-amber-600">{stats.pending}</span>
              </span>
              <span>
                共 <span className="font-medium text-foreground">{stats.total}</span>
              </span>
            </div>
          </div>

          <div className="p-4">
            {combinationsForSelectedIp.length === 0 ? (
              <div className="py-8 text-center text-sm text-warm-silver">
                {selectedIpId ? '该IP暂无待生成的组合' : '请先选择IP'}
              </div>
            ) : (
              <div className="space-y-2">
                {combinationsForSelectedIp.map(combo => {
                  const isGenerated = !!combo.existingModelImageId
                  const isSelected = selectedCombinations.has(combo.id)

                  return (
                    <div
                      key={combo.id}
                      className={`
                        flex items-center justify-between rounded-lg border px-4 py-3 transition-all
                        ${isGenerated
                          ? 'border-matcha-600/30 bg-matcha-50/50'
                          : 'border-oat bg-white hover:border-matcha-600'
                        }
                        ${isSelected && !isGenerated ? 'ring-2 ring-matcha-600 ring-offset-1' : ''}
                      `}
                    >
                      <div className="flex items-center gap-4">
                        {!isGenerated && (
                          <button
                            onClick={() => handleToggleCombination(combo.id)}
                            className={`
                              w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                              ${isSelected
                                ? 'bg-matcha-600 border-matcha-600'
                                : 'border-gray-300 hover:border-matcha-600'
                              }
                            `}
                          >
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        )}
                        {isGenerated && (
                          <div className="w-5 h-5" />
                        )}

                        {/* IP Avatar */}
                        {combo.ip.fullBodyUrl ? (
                          <img
                            src={getImageUrl(combo.ip.fullBodyUrl)}
                            alt={combo.ip.nickname}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-oat flex items-center justify-center text-xs text-warm-silver">
                            无
                          </div>
                        )}
                        <span className="text-sm font-medium">{combo.ip.nickname}</span>

                        <span className="text-warm-silver">×</span>

                        {/* Product Image */}
                        {combo.product.mainImageUrl ? (
                          <img
                            src={getImageUrl(combo.product.mainImageUrl)}
                            alt={combo.product.name}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-oat flex items-center justify-center text-xs text-warm-silver">
                            无
                          </div>
                        )}
                        <span className="text-sm text-warm-silver">{combo.product.name}</span>
                      </div>

                      <div>
                        {isGenerated ? (
                          <Badge variant="success" className="text-xs">
                            已生成
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="text-xs">
                            待生成
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer with actions */}
          {combinationsForSelectedIp.length > 0 && stats.pending > 0 && (
            <div className="flex items-center justify-between border-t border-oat px-4 py-3">
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-warm-silver hover:text-foreground transition-colors"
                >
                  全选待生成
                </button>
                <span className="text-warm-silver">|</span>
                <button
                  onClick={handleDeselectAll}
                  className="text-xs text-warm-silver hover:text-foreground transition-colors"
                >
                  清空选择
                </button>
              </div>
              <Button
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
                  <>生成 {selectedCombinations.size > 0 && `(${selectedCombinations.size})`}</>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
