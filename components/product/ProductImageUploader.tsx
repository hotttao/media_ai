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

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="
          w-full py-12 rounded-2xl
          border-2 border-dashed border-white/20
          hover:border-violet-500/50
          bg-white/5 hover:bg-white/10
          transition-all duration-300
          group
        "
      >
        {uploading ? (
          <span className="flex items-center justify-center gap-2 text-white/60">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            上传中...
          </span>
        ) : (
          <span className="flex flex-col items-center justify-center gap-3 text-white/40 group-hover:text-white/60">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm">点击上传产品图片</span>
          </span>
        )}
      </button>

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative aspect-[9/16] max-w-24 rounded-xl overflow-hidden bg-black/20 group"
              style={{
                border: image.isMain ? '2px solid #8b5cf6' : '2px solid rgba(255,255,255,0.1)',
              }}
            >
              <img
                src={image.url}
                alt={`Product ${index + 1}`}
                className="w-full h-full object-contain"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setMainImage(index)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    image.isMain
                      ? 'bg-violet-600 text-white'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {image.isMain ? '主图' : '设为主图'}
                </button>
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="px-3 py-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-xs text-white font-medium transition-colors"
                >
                  删除
                </button>
              </div>

              {image.isMain && (
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-violet-600 text-white text-xs font-medium rounded-md shadow-lg">
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
