'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ProductCard } from '@/components/product/ProductCard'

interface Product {
  id: string
  name: string
  targetAudience: 'MENS' | 'WOMENS' | 'KIDS'
  tags: string | null
  images: { url: string; isMain: boolean }[]
  createdAt: string
}

const audienceOptions = [
  { value: 'ALL', label: '全部', gradient: 'from-gray-500/20 to-slate-600/20' },
  { value: 'WOMENS', label: '女装', gradient: 'from-rose-500/20 to-pink-600/20', accent: '#f9a8d4' },
  { value: 'MENS', label: '男装', gradient: 'from-slate-500/20 to-zinc-600/20', accent: '#94a3b8' },
  { value: 'KIDS', label: '童装', gradient: 'from-amber-500/20 to-orange-600/20', accent: '#fcd34d' },
]

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [targetAudience, setTargetAudience] = useState('ALL')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchProducts()
    setLoaded(true)
  }, [])

  async function fetchProducts() {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (targetAudience !== 'ALL') params.set('targetAudience', targetAudience)

      const response = await fetch(`/api/products?${params}`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchProducts()
    }, 300)
    return () => clearTimeout(timeout)
  }, [search, targetAudience])

  const selectedFilter = audienceOptions.find(o => o.value === targetAudience) || audienceOptions[0]

  return (
    <div className={`min-h-screen transition-all duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`}>
      {/* Hero Section */}
      <div className="relative mb-10 overflow-hidden rounded-3xl">
        {/* Background gradient mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 via-purple-900/30 to-fuchsia-900/40" />
        <div className="absolute inset-0 backdrop-blur-xl" />

        {/* Animated gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-fuchsia-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        {/* Content */}
        <div className="relative p-10">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">产品库</h1>
              <p className="text-white/60 mt-1">管理您的服装产品素材</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-8 mt-6">
            <div className="relative">
              <span className="text-4xl font-bold text-white">{products.length}</span>
              <span className="text-white/40 ml-2">个产品</span>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div className="relative">
              <span className="text-4xl font-bold text-white">
                {products.reduce((acc, p) => acc + (p.images?.length || 0), 0)}
              </span>
              <span className="text-white/40 ml-2">张图片</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-black/40 rounded-2xl p-4 mb-8 border border-white/5">
        <div className="flex items-center gap-4">
          {/* Search input */}
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索产品名称..."
              className="
                w-full pl-12 pr-4 py-3 rounded-xl
                bg-white/5 border border-white/10
                text-white placeholder:text-white/30
                focus:outline-none focus:border-violet-500/50 focus:bg-white/10
                transition-all duration-300
              "
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Add button */}
          <Link
            href="/products/new"
            className="
              flex items-center gap-2 px-6 py-3 rounded-xl
              bg-gradient-to-r from-violet-600 to-fuchsia-600
              text-white font-medium shadow-lg shadow-violet-500/30
              hover:shadow-xl hover:scale-[1.02]
              transition-all duration-300
            "
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            添加产品
          </Link>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          {audienceOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setTargetAudience(option.value)}
              className={`
                relative px-5 py-2 rounded-full text-sm font-medium
                transition-all duration-300 whitespace-nowrap
                ${targetAudience === option.value
                  ? 'text-white'
                  : 'text-white/50 hover:text-white/70'
                }
              `}
            >
              {targetAudience === option.value && (
                <span
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${option.gradient.replace('/20', '/30')}, ${option.gradient.replace('/20', '/15')})`,
                    border: `1px solid ${option.accent || 'rgba(255,255,255,0.2)'}40`,
                  }}
                />
              )}
              <span className="relative z-10">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-fuchsia-500/20 border-t-fuchsia-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDelay: '0.5s' }} />
          </div>
        </div>
      ) : products.length === 0 ? (
        <div
          className="
            relative flex flex-col items-center justify-center
            py-24 rounded-3xl overflow-hidden
            border border-dashed border-white/10
          "
          style={{ background: 'linear-gradient(135deg, rgba(88,28,135,0.1) 0%, rgba(30,30,40,0.5) 100%)' }}
        >
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-fuchsia-500/10 rounded-full blur-3xl" />

          <div className="relative text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
              <svg className="w-12 h-12 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white/80 mb-2">暂无产品</h3>
            <p className="text-white/40 mb-6 max-w-sm">
              {search || targetAudience !== 'ALL'
                ? '没有找到匹配的产品，试试其他筛选条件'
                : '开始添加您的第一个产品，构建专属的产品素材库'
              }
            </p>
            <Link
              href="/products/new"
              className="
                inline-flex items-center gap-2 px-6 py-3 rounded-xl
                bg-gradient-to-r from-violet-600 to-fuchsia-600
                text-white font-medium shadow-lg
                hover:shadow-xl hover:scale-[1.02]
                transition-all duration-300
              "
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              添加第一个产品
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {products.map((product, index) => (
            <div
              key={product.id}
              className="animate-in"
              style={{
                animationDuration: '500ms',
                animationDelay: `${index * 50}ms`,
                animationFillMode: 'backwards',
              }}
            >
              <ProductCard product={product as any} />
            </div>
          ))}
        </div>
      )}

      {/* Floating gradient orbs for atmosphere */}
      <div className="fixed top-1/4 -right-64 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="fixed bottom-1/4 -left-64 w-[400px] h-[400px] bg-fuchsia-600/10 rounded-full blur-[100px] pointer-events-none -z-10" />
    </div>
  )
}
