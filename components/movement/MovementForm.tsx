'use client'

import { useState } from 'react'

interface MovementFormProps {
  movement?: {
    id?: string
    url?: string | null
    content: string
    clothing?: string | null
    scope?: string | null
  }
  onSubmit: (data: { url?: string; content: string; clothing?: string; scope?: string }) => void
  onCancel: () => void
}

export function MovementForm({ movement, onSubmit, onCancel }: MovementFormProps) {
  const [url, setUrl] = useState(movement?.url || '')
  const [content, setContent] = useState(movement?.content || '')
  const [clothing, setClothing] = useState(movement?.clothing || '')
  const [scope, setScope] = useState(movement?.scope || '')
  const [isVideo, setIsVideo] = useState(!!movement?.url)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    onSubmit({
      url: isVideo && url ? url : undefined,
      content: content.trim(),
      clothing: clothing.trim() || undefined,
      scope: scope.trim() || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsVideo(false)}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            !isVideo
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
              : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
          }`}
        >
          文字动作
        </button>
        <button
          type="button"
          onClick={() => setIsVideo(true)}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            isVideo
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
              : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
          }`}
        >
          视频动作
        </button>
      </div>

      {/* Video URL (if video type) */}
      {isVideo && (
        <div>
          <label className="block text-sm text-white/60 mb-1">视频地址</label>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      )}

      {/* Content */}
      <div>
        <label className="block text-sm text-white/60 mb-1">
          动作描述 {isVideo ? '(可选)' : '(必填)'}
        </label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="描述动作，如：转身展示背部，双手抚摸头发..."
          rows={3}
          className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 resize-none"
        />
      </div>

      {/* Clothing */}
      <div>
        <label className="block text-sm text-white/60 mb-1">穿戴服装（可选）</label>
        <input
          type="text"
          value={clothing}
          onChange={e => setClothing(e.target.value)}
          placeholder="如：白色连衣裙"
          className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      {/* Scope */}
      <div>
        <label className="block text-sm text-white/60 mb-1">适合的服装类型（可选）</label>
        <input
          type="text"
          value={scope}
          onChange={e => setScope(e.target.value)}
          placeholder="如：适合转身动作，不适合蹲下"
          className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 px-4 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-all"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={!content.trim() || (isVideo && !url.trim())}
          className="flex-1 py-2 px-4 rounded-lg bg-gradient-to-r from-cyan-600 to-emerald-600 text-white font-medium disabled:opacity-50 hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
        >
          {movement?.id ? '更新' : '创建'}
        </button>
      </div>
    </form>
  )
}
