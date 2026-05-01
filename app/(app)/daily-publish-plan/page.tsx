'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { cn, getImageUrl } from '@/foundation/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface ProductStats {
  productId: string
  productName: string
  productImage: string
  ipId: string
  aiVideoCount: number
  pushableCount: number
  publishedCount: number
  clippableCount: number
  newGeneratableCount: number
}

interface IpOption {
  id: string
  nickname: string
}

export default function DailyPublishPlanPage() {
  const { data: session } = useSession()
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [products, setProducts] = useState<ProductStats[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clippingProductId, setClippingProductId] = useState<string | null>(null)
  const [selectedIpId, setSelectedIpId] = useState<string | null>(null)

  // Fetch products for selected date
  const fetchProducts = async () => {
    if (!selectedDate) return
    setLoading(true)
    try {
      const res = await fetch(`/api/daily-publish-plan/${selectedDate}/products`)
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products || [])
      } else {
        throw new Error('Failed to fetch products')
      }
    } catch (err) {
      console.error(err)
      setError('加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate])

  // 获取所有可用的 IP 列表
  const availableIps = useMemo(() => {
    const ipMap = new Map<string, IpOption>()
    products.forEach(p => {
      if (p.ipId && !ipMap.has(p.ipId)) {
        ipMap.set(p.ipId, { id: p.ipId, nickname: p.ipId }) // 暂时用 ipId 作为昵称
      }
    })
    return Array.from(ipMap.values())
  }, [products])

  // 过滤后的产品列表
  const filteredProducts = useMemo(() => {
    if (!selectedIpId) return products
    return products.filter(p => p.ipId === selectedIpId)
  }, [products, selectedIpId])

  // Handle clip button click
  const handleClip = async (productId: string, productName: string) => {
    if (!confirm(`确定对 ${productName} 执行剪辑？将使用随机背景音乐。`)) {
      return
    }

    setClippingProductId(productId)
    try {
      const res = await fetch('/api/video-push/clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })

      if (res.ok) {
        const data = await res.json()
        alert(`剪辑任务已提交，创建了 ${data.videos?.length || 0} 个视频`)
        fetchProducts() // Refresh list
      } else {
        const err = await res.json()
        alert(`剪辑失败: ${err.error}`)
      }
    } catch (err) {
      console.error(err)
      alert('剪辑失败')
    } finally {
      setClippingProductId(null)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">当日发布计划</h1>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        />
      </div>

      {error ? (
        <div className="text-center py-12 text-red-500">{error}</div>
      ) : loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>暂无产品</p>
          <p className="text-sm mt-2">在产品详情页添加产品到当日发布计划</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* IP 筛选 */}
          {availableIps.length > 1 && (
            <div className="rounded-xl border border-oat bg-white shadow-clay">
              <div className="border-b border-oat px-4 py-3">
                <h3 className="text-sm font-semibold">筛选虚拟IP</h3>
              </div>
              <div className="p-4">
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedIpId(null)}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm transition-all',
                      !selectedIpId
                        ? 'bg-matcha-600 text-white'
                        : 'bg-oat hover:bg-matcha-100'
                    )}
                  >
                    全部 ({products.length})
                  </button>
                  {availableIps.map(ip => {
                    const count = products.filter(p => p.ipId === ip.id).length
                    return (
                      <button
                        key={ip.id}
                        onClick={() => setSelectedIpId(ip.id)}
                        className={cn(
                          'px-4 py-2 rounded-lg text-sm transition-all',
                          selectedIpId === ip.id
                            ? 'bg-matcha-600 text-white'
                            : 'bg-oat hover:bg-matcha-100'
                        )}
                      >
                        {ip.nickname} ({count})
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 产品列表 */}
          <div className="space-y-4">
            {filteredProducts.map(product => (
              <div
                key={product.productId}
                className="rounded-xl border border-oat bg-white shadow-clay overflow-hidden"
              >
                {/* 产品头部 */}
                <div className="flex items-center gap-4 p-4 border-b border-oat">
                  <img
                    src={getImageUrl(product.productImage)}
                    alt={product.productName}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold">{product.productName}</h3>
                    <p className="text-sm text-warm-silver mt-1">IP: {product.ipId}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleClip(product.productId, product.productName)}
                      disabled={clippingProductId === product.productId || product.clippableCount === 0}
                      className="bg-matcha-600 hover:bg-matcha-500"
                    >
                      {clippingProductId === product.productId ? '剪辑中...' : '剪辑'}
                    </Button>
                    <Link href={`/products/${product.productId}`}>
                      <Button variant="outline">查看产品</Button>
                    </Link>
                  </div>
                </div>

                {/* 统计信息 */}
                <div className="p-4">
                  <div className="grid grid-cols-5 gap-4">
                    <StatCard
                      label="AI视频数"
                      value={product.aiVideoCount}
                      color="bg-blue-50 border-blue-200"
                    />
                    <StatCard
                      label="已发布数"
                      value={product.publishedCount}
                      color="bg-green-50 border-green-200"
                    />
                    <StatCard
                      label="可发布数"
                      value={product.pushableCount}
                      color="bg-yellow-50 border-yellow-200"
                    />
                    <StatCard
                      label="可剪辑数"
                      value={product.clippableCount}
                      color="bg-purple-50 border-purple-200"
                    />
                    <StatCard
                      label="可新增AI视频"
                      value={product.newGeneratableCount}
                      color="bg-orange-50 border-orange-200"
                    />
                  </div>

                  {/* 操作提示 */}
                  <div className="mt-4 flex items-center gap-2 text-sm">
                    {product.pushableCount > 0 ? (
                      <Badge variant="success">✓ 有可发布视频</Badge>
                    ) : product.clippableCount > 0 ? (
                      <Badge variant="warning">可剪辑生成更多视频</Badge>
                    ) : product.newGeneratableCount > 0 ? (
                      <Badge variant="info">可新增AI视频</Badge>
                    ) : (
                      <Badge variant="secondary">素材库已满，需更新素材</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-8 text-warm-silver">
              该IP下暂无产品
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={cn('rounded-lg border p-3 text-center', color)}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-warm-silver mt-1">{label}</div>
    </div>
  )
}