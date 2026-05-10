'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { cn, getImageUrl } from '@/foundation/lib/utils'

interface AvailableIp {
  id: string
  nickname: string
  avatarUrl: string | null
}

interface DailyPlanProduct {
  planId: string
  productId: string
  productName: string
  productImage: string
  isUnassigned: boolean
  videoCount: number
  publishedCount: number
  ipId: string | null
  ipNickname: string | null
}

export default function DailyPublishPlanPage() {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [dailyPlanProducts, setDailyPlanProducts] = useState<DailyPlanProduct[]>([])
  const [availableIps, setAvailableIps] = useState<AvailableIp[]>([])
  const [selectedIpId, setSelectedIpId] = useState<string | null>(null)
  const [loadingProducts, setLoadingProducts] = useState(false)

  // Fetch daily plan products
  const fetchDailyPlanProducts = useCallback(async () => {
    setLoadingProducts(true)
    try {
      const res = await fetch(`/api/daily-publish-plan/plan-products?date=${selectedDate}`)
      if (res.ok) {
        const data = await res.json()
        setDailyPlanProducts(data.products || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingProducts(false)
    }
  }, [selectedDate])

  // Fetch all IPs
  const fetchAvailableIps = useCallback(async () => {
    try {
      const res = await fetch('/api/virtual-ips')
      if (res.ok) {
        const ips = await res.json()
        setAvailableIps(ips)
      }
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => {
    fetchDailyPlanProducts()
    fetchAvailableIps()
  }, [fetchDailyPlanProducts, fetchAvailableIps])

  // Join product to IP (creates VideoPush record)
  const handleJoinIp = async (productId: string, ipId: string) => {
    try {
      await fetch('/api/daily-publish-plan/assign-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, ipId, date: selectedDate }),
      })
      fetchDailyPlanProducts()
    } catch (err) {
      console.error(err)
    }
  }

  // Cancel join (remove VideoPush record)
  const handleCancelJoin = async (productId: string, ipId: string) => {
    try {
      await fetch(`/api/daily-publish-plan/assign-ip?productId=${productId}&ipId=${ipId}`, {
        method: 'DELETE',
      })
      fetchDailyPlanProducts()
    } catch (err) {
      console.error(err)
    }
  }

  // Add product to daily plan
  const handleAddToPlan = async (productId: string) => {
    try {
      await fetch('/api/daily-publish-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, planDate: selectedDate }),
      })
      fetchDailyPlanProducts()
    } catch (err) {
      console.error(err)
    }
  }

  // Remove from daily plan
  const handleRemoveFromPlan = async (planId: string) => {
    try {
      await fetch(`/api/daily-publish-plan/${planId}`, {
        method: 'DELETE',
      })
      fetchDailyPlanProducts()
    } catch (err) {
      console.error(err)
    }
  }

  // Navigate to publish page
  const handleGoToPublish = (productId: string, ipId: string) => {
    router.push(`/daily-publish-plan/ip/${ipId}?productId=${productId}`)
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
      <div className="fixed top-20 left-20 w-96 h-96 bg-violet-300/30 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-20 right-20 w-80 h-80 bg-fuchsia-300/30 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
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
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="px-3 py-2 rounded-lg border border-oat bg-white text-sm text-matcha-600 font-medium hover:bg-matcha-50 hover:border-matcha-600 transition-all shadow-sm"
            >
              今日
            </button>
          </div>
        </div>

        {/* IP Selection Bar */}
        {availableIps.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              <span className="text-sm text-warm-silver flex-shrink-0">选择 IP：</span>
              {availableIps.map((ip) => {
                const isSelected = selectedIpId === ip.id
                const productCount = dailyPlanProducts.filter(p => p.ipId === ip.id).length
                return (
                  <button
                    key={ip.id}
                    onClick={() => setSelectedIpId(isSelected ? null : ip.id)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl transition-all flex-shrink-0',
                      isSelected
                        ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30'
                        : 'bg-white border border-oat hover:border-violet-400 hover:shadow-md'
                    )}
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg overflow-hidden',
                        isSelected ? 'bg-white/20' : 'bg-matcha-100'
                      )}
                    >
                      {ip.avatarUrl ? (
                        <img src={getImageUrl(ip.avatarUrl)} alt={ip.nickname} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg font-bold text-warm-silver">
                          {ip.nickname?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
                    <div className="text-left">
                      <div className={cn('text-sm font-medium', isSelected ? 'text-white' : 'text-warm-charcoal')}>
                        {ip.nickname || ip.id.slice(0, 8)}
                      </div>
                      {productCount > 0 && (
                        <div className={cn('text-xs', isSelected ? 'text-white/70' : 'text-warm-silver')}>
                          {productCount} 个商品
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Main Content */}
        {loadingProducts ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : dailyPlanProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-violet-50 mb-6">
              <svg className="w-10 h-10 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-warm-charcoal mb-2">暂无发布计划</h2>
            <p className="text-warm-silver text-sm mb-6">点击下方按钮添加商品到当日发布计划</p>
          </div>
        ) : (
          <div className="space-y-4">
            {dailyPlanProducts.map((product, index) => {
              const hasIpAssigned = product.ipId && product.ipNickname
              const isIpSelected = selectedIpId && product.ipId === selectedIpId

              return (
                <div
                  key={product.planId}
                  className="flex items-center gap-4 p-4 rounded-xl border border-oat bg-white hover:shadow-md transition-all"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  {/* Product Image */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-matcha-100 flex-shrink-0">
                    {product.productImage ? (
                      <img src={getImageUrl(product.productImage)} alt={product.productName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-7 h-7 text-matcha-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-warm-charcoal truncate">{product.productName}</div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-warm-silver">
                        <span className="font-medium text-violet-600">{product.videoCount}</span> 个视频
                      </span>
                      {product.publishedCount > 0 && (
                        <span className="text-xs text-warm-silver">
                          <span className="font-medium text-emerald-600">{product.publishedCount}</span> 次发布
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status & Actions */}
                  {hasIpAssigned ? (
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-200">
                        <span className="text-xs text-violet-600 font-medium">{product.ipNickname}</span>
                      </div>
                      <button
                        onClick={() => handleGoToPublish(product.productId, product.ipId!)}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-medium shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
                      >
                        进入发布
                      </button>
                      <button
                        onClick={() => handleCancelJoin(product.productId, product.ipId!)}
                        className="px-3 py-2 rounded-lg border border-red-200 text-red-400 text-sm hover:bg-red-50 transition-all"
                      >
                        取消加入
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-warm-silver px-3 py-1.5 rounded-full bg-gray-100">待加入</span>
                      <select
                        className="px-3 py-2 rounded-lg border border-oat bg-white text-sm text-warm-charcoal hover:border-violet-400 transition-all"
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleJoinIp(product.productId, e.target.value)
                          }
                        }}
                      >
                        <option value="">加入 IP</option>
                        {availableIps.map((ip) => (
                          <option key={ip.id} value={ip.id}>
                            {ip.nickname || ip.id.slice(0, 8)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Remove from plan */}
                  <button
                    onClick={() => handleRemoveFromPlan(product.planId)}
                    className="p-2 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 transition-all flex-shrink-0"
                    title="从计划中移除"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Add Products Section */}
        <div className="mt-8 p-6 rounded-2xl border-2 border-dashed border-violet-200 bg-white/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-warm-charcoal">添加商品</h3>
            <button
              onClick={() => router.push('/products')}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-medium hover:shadow-lg transition-all"
            >
              去产品库选择
            </button>
          </div>
          <p className="text-sm text-warm-silver">
            从产品库选择商品后，自动添加到当日发布计划（{formatDate(selectedDate)}）
          </p>
        </div>
      </div>
    </div>
  )
}
