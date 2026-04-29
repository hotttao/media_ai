'use client'

import { useState, useEffect } from 'react'
import { CombinationToolPage } from '@/components/video-generation/CombinationToolPage'
import type { GeneratedCombination } from '@/components/video-generation/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, getImageUrl } from '@/foundation/lib/utils'

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

export default function ModelImagePage() {
  const [loading, setLoading] = useState(true)
  const [ips, setIps] = useState<IpOption[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [selectedIpId, setSelectedIpId] = useState<string | null>(null)
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set())
  const [existingSet, setExistingSet] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetch('/api/tools/combination/model-images')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then((data: Array<{ ip: IpOption; product: ProductOption; existingModelImageId: string | null }>) => {
        // IP 去重
        const ipMap = new Map<string, IpOption>()
        for (const c of data) {
          if (!ipMap.has(c.ip.id)) {
            ipMap.set(c.ip.id, c.ip)
          }
        }
        setIps(Array.from(ipMap.values()))

        // 产品去重
        const productMap = new Map<string, ProductOption>()
        for (const c of data) {
          if (!productMap.has(c.product.id)) {
            productMap.set(c.product.id, c.product)
          }
        }
        setProducts(Array.from(productMap.values()))

        // 已存在的组合
        setExistingSet(new Set(data.filter(c => c.existingModelImageId).map(c => `${c.ip.id}|${c.product.id}`)))

        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  const selectedIp = ips.find(ip => ip.id === selectedIpId)
  const combinations: GeneratedCombination[] = []

  if (selectedIpId) {
    for (const productId of selectedProductIds) {
      const product = products.find(p => p.id === productId)
      if (product) {
        const key = `${selectedIpId}|${productId}`
        combinations.push({
          id: key,
          key,
          itemA: { id: selectedIpId, name: selectedIp.nickname, url: selectedIp.fullBodyUrl },
          itemB: { id: productId, name: product.name, url: product.mainImageUrl },
          status: existingSet.has(key) ? 'generated' : 'pending',
        })
      }
    }
  }

  const pendingCount = combinations.filter(c => c.status === 'pending').length

  const handleProductToggle = (productId: string) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })
  }

  const handleGenerate = async () => {
    if (!selectedIpId || pendingCount === 0) return

    setGenerating(true)
    try {
      for (const combo of combinations.filter(c => c.status === 'pending')) {
        const [ipId, productId] = combo.key.split('|')
        await fetch('/api/tools/combination/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'model-image', ipId, productId }),
        })
      }
      alert('已提交生成任务')
    } catch (err) {
      console.error(err)
      alert('生成失败')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <CombinationToolPage title="模特图生成" description="选择虚拟IP和产品，生成模特图" icon="👗">
        <div className="flex items-center justify-center rounded-xl border border-oat bg-white px-6 py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-matcha-600 border-t-transparent"></div>
          <span className="ml-3 text-sm text-warm-silver">加载中...</span>
        </div>
      </CombinationToolPage>
    )
  }

  return (
    <CombinationToolPage title="模特图生成" description="选择虚拟IP和产品，生成模特图" icon="👗">
      <div className="space-y-8">
        {/* IP 选择 - 单选 */}
        <div className="rounded-xl border border-oat bg-white shadow-clay">
          <div className="border-b border-oat px-4 py-3">
            <h3 className="text-sm font-semibold">选择虚拟IP</h3>
          </div>
          <div className="p-4">
            {ips.length === 0 ? (
              <p className="text-sm text-warm-silver">暂无可用IP</p>
            ) : (
              <div className="flex gap-3">
                {ips.map(ip => (
                  <button
                    key={ip.id}
                    onClick={() => setSelectedIpId(ip.id)}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all',
                      selectedIpId === ip.id
                        ? 'border-matcha-600 bg-matcha-50'
                        : 'border-oat hover:border-matcha-600'
                    )}
                  >
                    {ip.fullBodyUrl ? (
                      <img src={getImageUrl(ip.fullBodyUrl)} alt={ip.nickname} className="h-20 w-20 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-oat text-sm text-warm-silver">无图片</div>
                    )}
                    <span className="text-sm font-medium">{ip.nickname}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 产品选择 - 多选，仅显示图片 */}
        <div className="rounded-xl border border-oat bg-white shadow-clay">
          <div className="flex items-center justify-between border-b border-oat px-4 py-3">
            <h3 className="text-sm font-semibold">选择产品</h3>
            <div className="flex gap-2 text-xs text-warm-silver">
              <button onClick={() => setSelectedProductIds(new Set(products.map(p => p.id)))} className="hover:text-foreground">全选</button>
              <span>|</span>
              <button onClick={() => setSelectedProductIds(new Set())} className="hover:text-foreground">清空</button>
            </div>
          </div>
          <div className="p-4">
            {products.length === 0 ? (
              <p className="text-sm text-warm-silver">暂无可用产品</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {products.map(product => (
                  <button
                    key={product.id}
                    onClick={() => handleProductToggle(product.id)}
                    className={cn(
                      'relative rounded-xl border-2 transition-all',
                      selectedProductIds.has(product.id)
                        ? 'border-matcha-600'
                        : 'border-transparent hover:border-matcha-400'
                    )}
                  >
                    {product.mainImageUrl ? (
                      <img src={getImageUrl(product.mainImageUrl)} alt={product.name} className="h-16 w-16 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-oat text-xs text-warm-silver">无图片</div>
                    )}
                    {selectedProductIds.has(product.id) && (
                      <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-matcha-600 text-white">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-oat px-4 py-2">
            <p className="text-xs text-warm-silver">已选择 {selectedProductIds.size} / {products.length}</p>
          </div>
        </div>

        {/* 组合预览 */}
        {combinations.length > 0 && (
          <div className="rounded-xl border border-oat bg-white shadow-clay">
            <div className="flex items-center justify-between border-b border-oat px-4 py-3">
              <h3 className="text-sm font-semibold">生成的组合</h3>
              <span className="text-xs text-warm-silver">
                待生成 <span className="font-medium text-foreground">{pendingCount}</span>
              </span>
            </div>
            <div className="max-h-60 overflow-y-auto p-4">
              <div className="space-y-2">
                {combinations.map(combo => (
                  <div
                    key={combo.id}
                    className={cn(
                      'flex items-center justify-between rounded-lg border px-3 py-2',
                      combo.status === 'pending' && 'border-oat bg-white',
                      combo.status === 'generated' && 'border-matcha-600/30 bg-matcha-50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {combo.itemA.url && (
                        <img src={getImageUrl(combo.itemA.url)} alt={combo.itemA.name} className="h-10 w-10 rounded-lg object-cover" />
                      )}
                      <span className="text-sm font-medium">{combo.itemA.name}</span>
                      <span className="text-warm-silver">×</span>
                      {combo.itemB.url && (
                        <img src={getImageUrl(combo.itemB.url)} alt={combo.itemB.name} className="h-10 w-10 rounded-lg object-cover" />
                      )}
                    </div>
                    {combo.status === 'generated' && (
                      <Badge variant="success" className="text-xs">已存在 ✓</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 生成按钮 */}
        <div className="flex items-center justify-end">
          <Button
            onClick={handleGenerate}
            disabled={!selectedIpId || selectedProductIds.size === 0 || pendingCount === 0 || generating}
            className="bg-matcha-600 hover:bg-matcha-500"
          >
            {generating ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                生成中...
              </>
            ) : (
              <>生成 {pendingCount > 0 && `(${pendingCount})`}</>
            )}
          </Button>
        </div>
      </div>
    </CombinationToolPage>
  )
}