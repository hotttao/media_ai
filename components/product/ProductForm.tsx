'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProductImageUploader } from './ProductImageUploader'

interface ImageItem {
  url: string
  isMain: boolean
  order: number
}

interface ProductFormProps {
  initialData?: {
    id?: string
    name: string
    targetAudience: string
    productDetails: string
    displayActions: string
    tags: string[]
    images: ImageItem[]
  }
  isEditing?: boolean
}

export function ProductForm({ initialData, isEditing }: ProductFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)

  const [name, setName] = useState(initialData?.name || '')
  const [targetAudience, setTargetAudience] = useState(initialData?.targetAudience || 'WOMENS')
  const [productDetails, setProductDetails] = useState(initialData?.productDetails || '')
  const [displayActions, setDisplayActions] = useState(initialData?.displayActions || '')
  const [tags, setTags] = useState(initialData?.tags?.join(', ') || '')
  const [images, setImages] = useState<ImageItem[]>(initialData?.images || [])

  async function handleExtractInfo() {
    if (images.length === 0) {
      alert('请先上传至少一张产品图片')
      return
    }

    setIsExtracting(true)

    try {
      const base64Images = await Promise.all(
        images.map(async (img) => {
          const response = await fetch(img.url)
          const blob = await response.blob()
          return new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(blob)
          })
        })
      )

      const response = await fetch('/api/products/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: base64Images }),
      })

      if (!response.ok) throw new Error('Extract failed')

      const data = await response.json()

      setName(data.name || name)
      setTargetAudience(data.targetAudience || targetAudience)
      setProductDetails(data.productDetails || productDetails)
      setDisplayActions(data.displayActions || displayActions)
    } catch (error) {
      alert(error instanceof Error ? error.message : '提取失败')
    } finally {
      setIsExtracting(false)
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)

    try {
      const payload = {
        name,
        targetAudience,
        productDetails: productDetails || undefined,
        displayActions: displayActions || undefined,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
        images: images.map((img, idx) => ({
          url: img.url,
          isMain: img.isMain,
          order: idx,
        })),
      }

      const url = isEditing && initialData?.id
        ? `/api/products/${initialData.id}`
        : '/api/products'

      const response = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Failed to save')

      router.push('/products')
      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : '保存失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Images */}
      <div className="space-y-3">
        <Label className="text-white/80 text-sm font-medium">产品图片</Label>
        <ProductImageUploader images={images} onChange={setImages} />

        {images.length > 0 && (
          <button
            type="button"
            onClick={handleExtractInfo}
            disabled={isExtracting}
            className="
              w-full py-3 rounded-xl
              bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20
              border border-violet-500/30
              text-white font-medium
              hover:from-violet-600/30 hover:to-fuchsia-600/30
              transition-all duration-300
              disabled:opacity-50
            "
          >
            {isExtracting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                分析中...
              </span>
            ) : (
              'AI 提取信息'
            )}
          </button>
        )}
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-white/80 text-sm font-medium">产品名称 *</Label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="输入产品名称"
          required
          className="
            w-full px-4 py-3 rounded-xl
            bg-white/5 border border-white/10
            text-white placeholder:text-white/30
            focus:outline-none focus:border-violet-500/50 focus:bg-white/10
            transition-all duration-300
          "
        />
      </div>

      {/* Target Audience */}
      <div className="space-y-2">
        <Label htmlFor="targetAudience" className="text-white/80 text-sm font-medium">适用人群 *</Label>
        <Select value={targetAudience} onValueChange={setTargetAudience}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-violet-500/50">
            <SelectValue placeholder="选择适用人群" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10 text-white">
            <SelectItem value="MENS" className="focus:bg-violet-600/20 focus:text-white">男装</SelectItem>
            <SelectItem value="WOMENS" className="focus:bg-violet-600/20 focus:text-white">女装</SelectItem>
            <SelectItem value="KIDS" className="focus:bg-violet-600/20 focus:text-white">童装</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label htmlFor="tags" className="text-white/80 text-sm font-medium">产品标签（逗号分隔）</Label>
        <input
          id="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="如: 春夏, 休闲, 运动"
          className="
            w-full px-4 py-3 rounded-xl
            bg-white/5 border border-white/10
            text-white placeholder:text-white/30
            focus:outline-none focus:border-violet-500/50 focus:bg-white/10
            transition-all duration-300
          "
        />
      </div>

      {/* Product Details */}
      <div className="space-y-2">
        <Label htmlFor="productDetails" className="text-white/80 text-sm font-medium">产品细节</Label>
        <textarea
          id="productDetails"
          value={productDetails}
          onChange={(e) => setProductDetails(e.target.value)}
          placeholder="描述产品特点、特殊设计等"
          rows={4}
          className="
            w-full px-4 py-3 rounded-xl
            bg-white/5 border border-white/10
            text-white placeholder:text-white/30
            focus:outline-none focus:border-violet-500/50 focus:bg-white/10
            transition-all duration-300 resize-none
          "
        />
      </div>

      {/* Display Actions */}
      <div className="space-y-2">
        <Label htmlFor="displayActions" className="text-white/80 text-sm font-medium">展示动作</Label>
        <textarea
          id="displayActions"
          value={displayActions}
          onChange={(e) => setDisplayActions(e.target.value)}
          placeholder="格式: 动作1: 描述&#10;动作2: 描述"
          rows={3}
          className="
            w-full px-4 py-3 rounded-xl
            bg-white/5 border border-white/10
            text-white placeholder:text-white/30
            focus:outline-none focus:border-violet-500/50 focus:bg-white/10
            transition-all duration-300 resize-none
          "
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading || !name.trim()}
        className="
          w-full py-3.5 rounded-xl
          bg-gradient-to-r from-violet-600 to-fuchsia-600
          text-white font-semibold shadow-lg shadow-violet-500/30
          hover:shadow-xl hover:scale-[1.01]
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
          transition-all duration-300
        "
      >
        {isLoading ? '保存中...' : isEditing ? '更新产品' : '创建产品'}
      </button>
    </form>
  )
}