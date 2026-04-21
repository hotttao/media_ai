'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'

interface ImageItem {
  url: string
  isMain: boolean
  order: number
}

interface ProductImageUploaderProps {
  images: ImageItem[]
  onChange: (images: ImageItem[]) => void
}

export function ProductImageUploader({ images, onChange }: ProductImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files || files.length === 0) return

    setUploading(true)

    try {
      const newImages: ImageItem[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // 上传文件
        const formData = new FormData()
        formData.append('file', file)
        formData.append('subDir', 'products')

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) throw new Error('Upload failed')

        const { url } = await response.json()

        newImages.push({
          url,
          isMain: images.length === 0 && i === 0,
          order: images.length + i,
        })
      }

      onChange([...images, ...newImages])
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function removeImage(index: number) {
    const updated = images.filter((_, i) => i !== index)
    if (updated.length > 0 && !updated.some(img => img.isMain)) {
      updated[0].isMain = true
    }
    onChange(updated)
  }

  function setMainImage(index: number) {
    const updated = images.map((img, i) => ({
      ...img,
      isMain: i === index,
    }))
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      {/* Upload button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? '上传中...' : '上传图片'}
      </Button>

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 group"
            >
              <img
                src={image.url}
                alt={`Product ${index + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setMainImage(index)}
                  className={`px-2 py-1 rounded text-xs text-white ${
                    image.isMain ? 'bg-matcha-600' : 'bg-black/50'
                  }`}
                >
                  {image.isMain ? '主图' : '设为主图'}
                </button>
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="px-2 py-1 rounded bg-red-500 text-xs text-white"
                >
                  删除
                </button>
              </div>

              {image.isMain && (
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-matcha-600 text-white text-xs rounded">
                  主图
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}