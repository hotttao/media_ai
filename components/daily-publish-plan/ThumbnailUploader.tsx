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
    <div className="relative w-16 rounded overflow-hidden border-2 border-dashed border-slate-300 hover:border-indigo-400 transition-colors" style={{ aspectRatio: '9/16' }}>
      {value && (
        <img src={getImageUrl(value)} alt="thumbnail" className="w-full h-full object-cover" />
      )}
      {!disabled && (
        <>
          {!value && (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
        </>
      )}
    </div>
  )
}
