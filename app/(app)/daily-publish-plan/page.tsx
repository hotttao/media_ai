'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { cn, getImageUrl } from '@/foundation/lib/utils'

interface IpInfo {
  ipId: string
  selected: boolean
  videoCount: number
}

interface ProductStats {
  productId: string
  productName: string
  productImage: string
  ips: IpInfo[]
}

export default function DailyPublishPlanPage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [products, setProducts] = useState<ProductStats[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIpId, setSelectedIpId] = useState<string | null>(null)

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
  }, [selectedDate])

  const availableIps = useMemo(() => {
    const ipMap = new Map<string, { id: string }>()
    products.forEach(p => {
      p.ips.forEach(ip => {
        if (ip.ipId && !ipMap.has(ip.ipId)) {
          ipMap.set(ip.ipId, { id: ip.ipId })
        }
      })
    })
    return Array.from(ipMap.values())
  }, [products])

  const filteredProducts = useMemo(() => {
    if (!selectedIpId) return products
    return products.filter(p => p.ips.some(ip => ip.ipId === selectedIpId))
  }, [products, selectedIpId])

  const aggregateStats = useMemo(() => {
    return filteredProducts.reduce((acc, p) => {
      const totalAi = p.ips.reduce((sum, ip) => sum + ip.videoCount, 0)
      return {
        totalAi: acc.totalAi + totalAi,
        totalPushable: acc.totalPushable,
        totalPublished: acc.totalPublished,
        totalClippable: acc.totalClippable,
        totalNewGeneratable: acc.totalNewGeneratable,
      }
    }), { totalAi: 0, totalPushable: 0, totalPublished: 0, totalClippable: 0, totalNewGeneratable: 0 })
  }, [filteredProducts])

  const handleToggleIpSelection = async (productId: string, ipId: string) => {
    try {
      const res = await fetch('/api/daily-publish-plan/assign-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, ipId, date: selectedDate }),
      })
      if (res.ok) {
        fetchProducts()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (dateStr === today.toISOString().split('T')[0]) return '今日'
    if (dateStr === tomorrow.toISOString().split('T')[0]) return '明日'
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-background to-fuchsia-100">
      {/* Floating orbs - 与 tools 页面一致 */}
      <div className="fixed top-20 left-20 w-96 h-96 bg-violet-300/30 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-20 right-20 w-80 h-80 bg-fuchsia-300/30 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-warm-charcoal tracking-tight">当日发布计划</h1>
              <p className="text-warm-silver text-sm mt-0.5">管理每日视频发布任务</p>
            </div>
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const d = new Date(selectedDate)
                d.setDate(d.getDate() - 1)
                setSelectedDate(d.toISOString().split('T')[0])
              }}
              className="w-9 h-9 rounded-lg border border-oat bg-white flex items-center justify-center text-warm-silver hover:bg-matcha-50 hover:border-matcha-600 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="px-4 py-2 rounded-lg bg-white border border-oat shadow-sm">
              <span className="text-matcha-600 font-semibold">{formatDate(selectedDate)}</span>
            </div>
            <button
              onClick={() => {
                const d = new Date(selectedDate)
                d.setDate(d.getDate() + 1)
                setSelectedDate(d.toISOString().split('T')[0])
              }}
              className="w-9 h-9 rounded-lg border border-oat bg-white flex items-center justify-center text-warm-silver hover:bg-matcha-50 hover:border-matcha-600 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="sr-only"
              id="date-input"
            />
            <label htmlFor="date-input" className="w-9 h-9 rounded-lg border border-oat bg-white flex items-center justify-center text-warm-silver hover:bg-matcha-50 hover:border-matcha-600 transition-all shadow-sm cursor-pointer">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </label>
          </div>
        </div>

        {error ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-red-500 font-medium">{error}</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <span className="ml-4 text-warm-silver">加载中...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-violet-50 mb-6">
              <svg className="w-10 h-10 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-warm-charcoal mb-2">暂无产品</h2>
            <p className="text-warm-silver text-sm mb-6">在产品详情页添加产品到当日发布计划</p>
            <Link href="/products" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-medium shadow-lg shadow-violet-500/30 hover:shadow-xl hover:scale-[1.02] transition-all">
              浏览产品
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        ) : (
          <>
            {/* IP Filter Tabs */}
            {availableIps.length > 1 && (
              <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                <button
                  onClick={() => setSelectedIpId(null)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all shadow-sm',
                    !selectedIpId
                      ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg'
                      : 'bg-white text-warm-silver hover:bg-violet-50 border border-oat'
                  )}
                >
                  全部 · {products.length}
                </button>
                {availableIps.map(ip => {
                  const count = products.filter(p => p.ips.some(i => i.ipId === ip.id)).length
                  return (
                    <button
                      key={ip.id}
                      onClick={() => setSelectedIpId(ip.id)}
                      className={cn(
                        'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all shadow-sm',
                        selectedIpId === ip.id
                          ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg'
                          : 'bg-white text-warm-silver hover:bg-violet-50 border border-oat'
                      )}
                    >
                      {ip.id.slice(0, 8)}... · {count}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Aggregate Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <StatCard label="AI视频" value={aggregateStats.totalAi} color="from-blue-50 to-blue-100/50" borderColor="border-blue-200" textColor="text-blue-600" />
              <StatCard label="已发布" value={aggregateStats.totalPublished} color="from-emerald-50 to-emerald-100/50" borderColor="border-emerald-200" textColor="text-emerald-600" />
              <StatCard label="待发布" value={aggregateStats.totalPushable} color="from-amber-50 to-amber-100/50" borderColor="border-amber-200" textColor="text-amber-600" />
            </div>

            {/* Product List */}
            <div className="space-y-4">
              {filteredProducts.map((product, index) => (
                <ProductCard
                  key={product.productId}
                  product={product}
                  index={index}
                  onToggleIp={handleToggleIpSelection}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color, borderColor, textColor }: { label: string; value: number; color: string; borderColor: string; textColor: string }) {
  return (
    <div className={cn('rounded-xl border p-4 bg-gradient-to-br shadow-sm', color, borderColor)}>
      <div className="text-xs text-warm-silver uppercase tracking-wider mb-1">{label}</div>
      <div className={cn('text-2xl font-bold', textColor)}>{value}</div>
    </div>
  )
}

function ProductCard({
  product,
  index,
  onToggleIp,
}: {
  product: ProductStats
  index: number
  onToggleIp: (productId: string, ipId: string) => void
}) {
  return (
    <div
      className="relative rounded-2xl border border-oat bg-white shadow-clay overflow-hidden group animate-[fadeInUp_0.4s_ease-out_forwards]"
      style={{ animationDelay: `${index * 60}ms`, opacity: 0 }}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="p-5">
        <div className="flex items-center gap-5">
          {/* Product Image */}
          <div className="relative flex-shrink-0">
            <img
              src={getImageUrl(product.productImage)}
              alt={product.productName}
              className="w-16 h-16 rounded-xl object-cover shadow-md"
            />
            <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-white border-2 border-oat flex items-center justify-center shadow-sm">
              <span className="text-[10px] font-bold text-warm-silver">{(index + 1).toString().padStart(2, '0')}</span>
            </div>
          </div>

          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-warm-charcoal mb-2 truncate">{product.productName}</h3>

            {/* IP List */}
            <div className="space-y-2">
              {product.ips.map(ip => (
                <div key={ip.ipId} className="flex items-center gap-3">
                  <button
                    onClick={() => onToggleIp(product.productId, ip.ipId)}
                    className="w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: ip.selected ? '#8b5cf6' : 'transparent',
                      borderColor: ip.selected ? '#8b5cf6' : '#d4c5b0',
                    }}
                  >
                    {ip.selected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <span className="text-xs text-warm-silver font-mono">{ip.ipId.slice(0, 12)}...</span>
                  <span className="text-xs text-warm-silver">{ip.videoCount}个视频</span>
                  <Link
                    href={`/daily-publish-plan/ip/${ip.ipId}/${product.productId}`}
                    className="ml-auto w-6 h-6 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 flex items-center justify-center text-white hover:scale-110 transition-all shadow-md"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
