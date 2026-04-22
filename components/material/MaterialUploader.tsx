'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function MaterialUploader() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'CLOTHING',
    visibility: 'PERSONAL',
    description: '',
    tags: '',
  })

  const typeOptions = [
    { value: 'CLOTHING', label: '服装', icon: '👕' },
    { value: 'SCENE', label: '场景', icon: '🏞️' },
    { value: 'ACTION', label: '动作', icon: '🎯' },
    { value: 'MAKEUP', label: '妆容', icon: '💄' },
    { value: 'ACCESSORY', label: '配饰', icon: '💍' },
    { value: 'OTHER', label: '其他', icon: '📦' },
  ]

  const visibilityOptions = [
    { value: 'PERSONAL', label: '私有', icon: '🔒' },
    { value: 'TEAM', label: '团队', icon: '👥' },
    { value: 'PUBLIC', label: '公共', icon: '🌍' },
  ]

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)

    const fileInput = document.getElementById('file') as HTMLInputElement
    const file = fileInput?.files?.[0]

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
        name: formData.name,
        type: formData.type,
        visibility: formData.visibility,
        description: formData.description || undefined,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
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

  async function handleExtractInfo() {
    if (!previewUrl) {
      alert('请先上传素材图片')
      return
    }

    setIsExtracting(true)

    try {
      // Convert preview URL to base64
      const response = await fetch(previewUrl)
      const blob = await response.blob()
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })

      const apiResponse = await fetch('/api/materials/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: [base64] }),
      })

      if (!apiResponse.ok) throw new Error('提取失败')

      const data = await apiResponse.json()

      setFormData(prev => ({
        ...prev,
        name: data.name || prev.name,
        type: data.type || prev.type,
        description: data.description || prev.description,
        tags: data.tags?.join(', ') || prev.tags,
      }))
    } catch (error) {
      alert(error instanceof Error ? error.message : '提取失败')
    } finally {
      setIsExtracting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-white">上传素材</h2>
        <button
          type="button"
          onClick={() => router.back()}
          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all duration-300"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* File Upload Area */}
      <div className="relative">
        <input
          id="file"
          name="file"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          required
        />
        <div className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center hover:border-cyan-500/50 hover:bg-white/5 transition-all duration-300 cursor-pointer group">
          {previewUrl ? (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-32 h-32 object-cover rounded-xl mx-auto shadow-lg"
              />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-white/60 group-hover:text-white/80 transition-colors duration-300">
                <span className="text-cyan-400 font-medium">点击上传</span> 或拖拽文件到这里
              </p>
              <p className="text-white/30 text-sm mt-2">支持 JPG、PNG、WebP 格式</p>
            </>
          )}
        </div>
      </div>

      {/* Name Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-white/70">素材名称</label>
          <button
            type="button"
            onClick={handleExtractInfo}
            disabled={!previewUrl || isExtracting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 text-cyan-400 text-sm font-medium hover:from-cyan-500/30 hover:to-emerald-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-cyan-500/30"
          >
            {isExtracting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                分析中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI 提取信息
              </>
            )}
          </button>
        </div>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="输入素材名称"
          required
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all duration-300"
        />
      </div>

      {/* Type & Visibility */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/70">素材类型</label>
          <div className="relative">
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white appearance-none cursor-pointer focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all duration-300"
              required
            >
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value} className="bg-gray-900 text-white">
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-white/70">可见性</label>
          <div className="relative">
            <select
              value={formData.visibility}
              onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white appearance-none cursor-pointer focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all duration-300"
              required
            >
              {visibilityOptions.map((option) => (
                <option key={option.value} value={option.value} className="bg-gray-900 text-white">
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-white/70">描述（可选）</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="素材描述..."
          rows={3}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all duration-300 resize-none"
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-white/70">标签（逗号分隔）</label>
        <input
          type="text"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder="如: 时尚, 潮流, 冬季"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all duration-300"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-medium shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
      >
        {isLoading ? (
          <>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            上传中...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            上传素材
          </>
        )}
      </button>
    </form>
  )
}
