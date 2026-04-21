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
      <div className="space-y-2">
        <Label>产品图片</Label>
        <ProductImageUploader images={images} onChange={setImages} />

        {images.length > 0 && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleExtractInfo}
            disabled={isExtracting}
          >
            {isExtracting ? '分析中...' : 'AI 提取信息'}
          </Button>
        )}
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">产品名称 *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="输入产品名称"
          required
        />
      </div>

      {/* Target Audience */}
      <div className="space-y-2">
        <Label htmlFor="targetAudience">适用人群 *</Label>
        <Select value={targetAudience} onValueChange={setTargetAudience}>
          <SelectTrigger>
            <SelectValue placeholder="选择适用人群" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MENS">男装</SelectItem>
            <SelectItem value="WOMENS">女装</SelectItem>
            <SelectItem value="KIDS">童装</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label htmlFor="tags">产品标签（逗号分隔）</Label>
        <Input
          id="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="如: 春夏, 休闲, 运动"
        />
      </div>

      {/* Product Details */}
      <div className="space-y-2">
        <Label htmlFor="productDetails">产品细节</Label>
        <textarea
          id="productDetails"
          value={productDetails}
          onChange={(e) => setProductDetails(e.target.value)}
          placeholder="描述产品特点、特殊设计等"
          rows={4}
          className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm"
        />
      </div>

      {/* Display Actions */}
      <div className="space-y-2">
        <Label htmlFor="displayActions">展示动作</Label>
        <textarea
          id="displayActions"
          value={displayActions}
          onChange={(e) => setDisplayActions(e.target.value)}
          placeholder="格式: 动作1: 描述&#10;动作2: 描述"
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm"
        />
      </div>

      {/* Submit */}
      <Button type="submit" disabled={isLoading || !name.trim()}>
        {isLoading ? '保存中...' : isEditing ? '更新产品' : '创建产品'}
      </Button>
    </form>
  )
}