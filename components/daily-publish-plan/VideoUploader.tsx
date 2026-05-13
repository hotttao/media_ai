'use client'

import { useState } from 'react'
import { cn, getImageUrl } from '@/foundation/lib/utils'

interface VideoUploaderProps {
  value: string
  onChange: (url: string) => void
  disabled?: boolean
}

export function VideoUploader({ value, onChange, disabled }: VideoUploaderProps) {
  const [uploading, setUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('subDir', 'clips')

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
    <div
      className={cn(
        'relative rounded-lg overflow-hidden border-2 border-dashed border-slate-300 hover:border-orange-400 transition-colors cursor-pointer',
        'flex items-center justify-center',
        !disabled && 'hover:border-orange-400'
      )}
      style={{ aspectRatio: '9/16', width: '60px' }}
    >
      {value && (
        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
          <span className="absolute top-1 left-1 bg-orange-500 text-white text-[8px] px-1 rounded z-10">手动</span>
          <svg className="w-6 h-6 text-white/80" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      )}
      {!disabled && (
        <>
          {!value && (
            <div className="flex flex-col items-center justify-center text-slate-400">
              {uploading ? (
                <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
              )}
            </div>
          )}
          <input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
        </>
      )}
    </div>
  )
}