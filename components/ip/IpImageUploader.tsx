'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface IpImageUploaderProps {
  ipId: string
  onUploadSuccess?: () => void
}

const IMAGE_FIELDS = [
  { name: 'avatar', label: '头像', desc: '用于 IP 展示', aspect: '1:1' },
  { name: 'fullBody', label: '全身图', desc: '正面全身/平面图', aspect: '3:4' },
  { name: 'threeView', label: '三视图', desc: '正面+侧面+背面', aspect: '1:1' },
  { name: 'nineView', label: '九视图', desc: '9 个角度展示', aspect: '1:1' },
]

export function IpImageUploader({ ipId, onUploadSuccess }: IpImageUploaderProps) {
  const router = useRouter()
  const [uploading, setUploading] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [files, setFiles] = useState<Record<string, File>>({})
  const [uploaded, setUploaded] = useState(false)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const handleFileChange = useCallback((fieldName: string, file: File | null) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreviews(prev => ({ ...prev, [fieldName]: url }))
    setFiles(prev => ({ ...prev, [fieldName]: file }))
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, fieldName: string) => {
    e.preventDefault()
    setDragOver(null)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      handleFileChange(fieldName, file)
      if (fileInputRefs.current[fieldName]) {
        const dt = new DataTransfer()
        dt.items.add(file)
        fileInputRefs.current[fieldName]!.files = dt.files
      }
    }
  }, [handleFileChange])

  async function onSubmit() {
    const hasFiles = Object.keys(files).length > 0
    if (!hasFiles) return

    setUploading('all')
    const formData = new FormData()

    Object.entries(files).forEach(([key, file]) => {
      formData.append(key, file)
    })

    try {
      const response = await fetch(`/api/ips/${ipId}/images`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      console.log('[Upload] Response:', data)

      if (!response.ok) throw new Error(data.error || 'Upload failed')

      setUploaded(true)
      setPreviews({})
      setFiles({})
      setTimeout(() => {
        router.refresh()
        onUploadSuccess?.()
      }, 1200)
    } catch (error) {
      console.error('Upload error:', error)
      alert('上传失败')
    } finally {
      setUploading(null)
    }
  }

  const hasFiles = Object.keys(files).length > 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-white/70">形象图上传</h4>
          <p className="text-xs text-white/30 mt-0.5">拖拽或点击上传</p>
        </div>
        {hasFiles && (
          <button
            onClick={onSubmit}
            disabled={uploading !== null}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-medium shadow-lg shadow-fuchsia-500/20 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                上传中...
              </>
            ) : (
              <>
                <span>↑</span>
                确认上传 ({Object.keys(files).length})
              </>
            )}
          </button>
        )}
      </div>

      {/* Success State */}
      {uploaded && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
            <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-white/80">上传成功</p>
          <p className="text-xs text-white/40 mt-1">页面即将刷新...</p>
        </div>
      )}

      {/* Image Grid */}
      {!uploaded && (
        <div className="grid grid-cols-4 gap-3">
          {IMAGE_FIELDS.map((field) => {
            const preview = previews[field.name]
            const isDragging = dragOver === field.name
            const isUploading = uploading === field.name

            return (
              <div
                key={field.name}
                className={`
                  relative rounded-2xl overflow-hidden transition-all duration-300
                  ${preview ? 'ring-2 ring-fuchsia-500/40' : 'ring-1 ring-white/10'}
                  ${isDragging ? 'ring-2 ring-fuchsia-500 scale-[1.02]' : ''}
                `}
                style={{
                  background: preview
                    ? 'rgba(0,0,0,0.3)'
                    : 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(field.name) }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => handleDrop(e, field.name)}
              >
                {preview ? (
                  <>
                    <img
                      src={preview}
                      alt={field.label}
                      className="w-full max-h-40 aspect-[9/16] object-contain bg-black/20"
                    />
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                      <p className="text-xs text-white/60">{field.label}</p>
                      <button
                        onClick={() => {
                          setPreviews(prev => {
                            const next = { ...prev }
                            delete next[field.name]
                            return next
                          })
                          setFiles(prev => {
                            const next = { ...prev }
                            delete next[field.name]
                            return next
                          })
                          if (fileInputRefs.current[field.name]) {
                            fileInputRefs.current[field.name]!.value = ''
                          }
                        }}
                        className="mt-1 text-xs text-red-400 hover:text-red-300 transition-colors text-left"
                      >
                        移除
                      </button>
                    </div>
                  </>
                ) : (
                  <label className="flex flex-col items-center justify-center aspect-[9/16] max-h-40 cursor-pointer group">
                    <div className={`
                      w-8 h-8 rounded-xl flex items-center justify-center mb-2 transition-all duration-300
                      ${isDragging ? 'bg-fuchsia-500/30 scale-110' : 'bg-white/5 group-hover:bg-white/10'}
                    `}>
                      <svg className="w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <p className="text-xs font-medium text-white/50 group-hover:text-white/70 transition-colors">{field.label}</p>
                    <p className="text-xs text-white/20 mt-0.5">点击或拖拽</p>
                    <input
                      ref={(el) => { fileInputRefs.current[field.name] = el }}
                      type="file"
                      name={field.name}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(field.name, e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Progress/Status */}
      {hasFiles && (
        <div className="flex items-center gap-3 pt-2">
          <div className="flex-1 h-px bg-gradient-to-r from-fuchsia-500/50 via-transparent to-transparent" />
          <span className="text-xs text-white/30">
            {Object.keys(files).length} / {IMAGE_FIELDS.length} 已选择
          </span>
          <div className="flex-1 h-px bg-gradient-to-l from-fuchsia-500/50 via-transparent to-transparent" />
        </div>
      )}
    </div>
  )
}
