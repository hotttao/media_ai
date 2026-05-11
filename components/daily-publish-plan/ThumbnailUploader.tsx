'use client'

import { useState } from 'react'
import { cn, getImageUrl } from '@/foundation/lib/utils'

interface ThumbnailUploaderProps {
  value: string
  onChange: (url: string) => void
  disabled?: boolean
}

export function ThumbnailUploader({ value, onChange, disabled }: ThumbnailUploaderProps) {
  const [uploading, setUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const { url } = await res.json()
        onChange(url)
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="relative w-16 h-12 rounded overflow-hidden bg-matcha-100">
      {value ? (
        <img src={getImageUrl(value)} alt="thumbnail" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-matcha-400">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={disabled || uploading}
        className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
    </div>
  )
}
