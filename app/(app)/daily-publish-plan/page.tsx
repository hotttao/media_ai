'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface ProductStats {
  productId: string
  productName: string
  productImage: string
  ipId: string
  aiVideoCount: number
  pushableCount: number
  publishedCount: number
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
        <div className="space-y-4">
          {products.map(product => (
            <div
              key={product.productId}
              className="border rounded-lg p-4 flex items-center gap-4"
            >
              <img
                src={product.productImage}
                alt={product.productName}
                className="w-16 h-16 object-cover rounded"
              />
              <div className="flex-1">
                <h3 className="font-medium">{product.productName}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  AI视频: {product.aiVideoCount} | 可发布: {product.pushableCount} | 已发布: {product.publishedCount}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleClip(product.productId, product.productName)}
                  disabled={clippingProductId === product.productId}
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
                >
                  {clippingProductId === product.productId ? '剪辑中...' : '剪辑'}
                </button>
                <Link
                  href={`/products/${product.productId}`}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  查看
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}