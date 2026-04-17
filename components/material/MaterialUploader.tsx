'use client'

import { useState } from 'react'
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
import { useRouter } from 'next/navigation'

export function MaterialUploader() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    const file = formData.get('file') as File

    if (!file || file.size === 0) {
      alert('请选择文件')
      setIsLoading(false)
      return
    }

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('subDir', 'materials')

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      if (!uploadResponse.ok) {
        throw new Error('文件上传失败')
      }

      const { url } = await uploadResponse.json()

      const materialData = {
        name: formData.get('name'),
        type: formData.get('type'),
        visibility: formData.get('visibility'),
        description: formData.get('description') || undefined,
        tags: (() => {
          const tags = formData.get('tags')
          return tags ? String(tags).split(',').map(t => t.trim()) : undefined
        })(),
        url,
      }

      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(materialData),
      })

      if (!response.ok) {
        throw new Error('素材创建失败')
      }

      router.push('/materials')
      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">素材名称</Label>
        <Input id="name" name="name" required placeholder="输入素材名称" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">素材类型</Label>
          <Select name="type" required defaultValue="CLOTHING">
            <SelectTrigger>
              <SelectValue placeholder="选择类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CLOTHING">服装</SelectItem>
              <SelectItem value="SCENE">场景</SelectItem>
              <SelectItem value="ACTION">动作</SelectItem>
              <SelectItem value="MAKEUP">妆容</SelectItem>
              <SelectItem value="ACCESSORY">配饰</SelectItem>
              <SelectItem value="OTHER">其他</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="visibility">可见性</Label>
          <Select name="visibility" required defaultValue="PERSONAL">
            <SelectTrigger>
              <SelectValue placeholder="选择可见性" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PERSONAL">私有</SelectItem>
              <SelectItem value="TEAM">团队</SelectItem>
              <SelectItem value="PUBLIC">公共</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="file">上传文件</Label>
        <Input
          id="file"
          name="file"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          required
        />
        {previewUrl && (
          <div className="mt-2">
            <img src={previewUrl} alt="Preview" className="w-32 h-32 object-cover rounded-lg" />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">描述</Label>
        <Input
          id="description"
          name="description"
          placeholder="素材描述（可选）"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">标签（逗号分隔）</Label>
        <Input
          id="tags"
          name="tags"
          placeholder="如: 时尚, 潮流, 冬季"
        />
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? '上传中...' : '上传素材'}
      </Button>
    </form>
  )
}