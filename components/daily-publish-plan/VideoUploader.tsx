'use client'

import { useState } from 'react'
import { cn, getImageUrl, getMediaUrl } from '@/foundation/lib/utils'

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

    console.log('[VideoUploader] 文件选择:', file.name, '大小:', file.size)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('subDir', 'clips')

      console.log('[VideoUploader] 开始上传:', file.name)
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const { url } = await res.json()
        console.log('[VideoUploader] 上传成功, url:', url)
        onChange(url)
      } else {
        console.error('[VideoUploader] 上传失败, status:', res.status)
      }
    } catch (err) {
      console.error('[VideoUploader] 上传异常:', err)
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
      {value ? (
        <>
          {/* 上传区域 - 整个区域可点击（除了播放按钮） */}
          <input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
            style={{ zIndex: 5 }}
            title="点击上传新视频"
          />
          {/* 播放按钮 - 中心区域点击播放（pointerEvents: auto 确保能点击） */}
          <div
            className="absolute bg-slate-900 flex items-center justify-center cursor-pointer rounded-lg"
            style={{
              zIndex: 10,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '40px',
              height: '40px',
              pointerEvents: 'auto'
            }}
            onClick={(e) => {
              e.stopPropagation()
              // 播放视频
              const videoUrl = getMediaUrl(value)
              window.open(videoUrl, '_blank')
            }}
          >
            <span className="absolute -top-5 left-0 bg-orange-500 text-white text-[8px] px-1 rounded z-10">手动</span>
            <svg className="w-4 h-4 text-white/80" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </>
      ) : (
        <>
          {!disabled && (
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
          {!disabled && (
            <input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              disabled={uploading}
              className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
          )}
        </>
      )}
    </div>
  )
}