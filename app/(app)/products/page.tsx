'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProductCard } from '@/components/product/ProductCard'

interface Product {
  id: string
  name: string
  targetAudience: 'MENS' | 'WOMENS' | 'KIDS'
  tags: string | null
  images: { url: string; isMain: boolean }[]
  createdAt: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [targetAudience, setTargetAudience] = useState<string>('ALL')

  useEffect(() => {
    fetchProducts()
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-matcha-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">产品库</h1>
          <p className="text-sm text-warm-silver mt-1">管理您的产品素材</p>
        </div>
        <Link href="/products/new">
          <Button>添加产品</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Input
          placeholder="搜索产品..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={targetAudience} onValueChange={setTargetAudience}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="适用人群" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">全部</SelectItem>
            <SelectItem value="MENS">男装</SelectItem>
            <SelectItem value="WOMENS">女装</SelectItem>
            <SelectItem value="KIDS">童装</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="text-center py-12 text-warm-silver">
          <p className="text-lg">暂无产品</p>
          <Link href="/products/new">
            <Button variant="link" className="mt-2">点击添加第一个产品</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product as any} />
          ))}
        </div>
      )}
    </div>
  )
}