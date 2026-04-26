'use client'

import { useEffect, useMemo, useState } from 'react'

interface PoseMaterial {
  id: string
  name: string
}

interface MovementFormProps {
  movement?: {
    id?: string
    url?: string | null
    content: string
    clothing?: string | null
    scope?: string | null
    isGeneral?: boolean
    poseIds?: string[]
  }
  onSubmit: (data: {
    url?: string
    content?: string
    clothing?: string
    scope?: string
    isGeneral?: boolean
    poseIds?: string[]
  }) => void
  onCancel: () => void
}

export function MovementForm({ movement, onSubmit, onCancel }: MovementFormProps) {
  const [poses, setPoses] = useState<PoseMaterial[]>([])
  const [url, setUrl] = useState(movement?.url || '')
  const [content, setContent] = useState(movement?.content || '')
  const [clothing, setClothing] = useState(movement?.clothing || '')
  const [scope, setScope] = useState(movement?.scope || '')
  const [isVideo, setIsVideo] = useState(!!movement?.url)
  const [isGeneral, setIsGeneral] = useState(movement?.isGeneral ?? true)
  const [selectedPoseIds, setSelectedPoseIds] = useState<string[]>(movement?.poseIds || [])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/materials?type=POSE')
      .then((res) => res.json())
      .then((data) => setPoses(Array.isArray(data) ? data : []))
      .catch(() => setPoses([]))
  }, [])

  const normalizedContent = useMemo(() => content.trim() || undefined, [content])
  const normalizedUrl = useMemo(() => (isVideo ? url.trim() || undefined : undefined), [isVideo, url])
  const canSubmit = Boolean(normalizedContent || normalizedUrl)

  const togglePose = (poseId: string) => {
    setSelectedPoseIds((current) =>
      current.includes(poseId)
        ? current.filter((id) => id !== poseId)
        : [...current, poseId]
    )
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    if (!canSubmit) {
      setError('动作描述或参考视频必须至少填写一个')
      return
    }

    if (!isGeneral && selectedPoseIds.length === 0) {
      setError('专用动作至少需要关联一个姿势')
      return
    }

    setError(null)

    onSubmit({
      url: normalizedUrl,
      content: normalizedContent,
      clothing: clothing.trim() || undefined,
      scope: scope.trim() || undefined,
      isGeneral,
      poseIds: isGeneral ? [] : selectedPoseIds,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsVideo(false)}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            !isVideo
              ? 'border border-blue-500/50 bg-blue-500/20 text-blue-400'
              : 'border border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          文字动作
        </button>
        <button
          type="button"
          onClick={() => setIsVideo(true)}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            isVideo
              ? 'border border-cyan-500/50 bg-cyan-500/20 text-cyan-400'
              : 'border border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          视频动作
        </button>
      </div>

      {isVideo && (
        <div>
          <label className="mb-1 block text-sm text-white/60">参考视频地址</label>
          <input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://..."
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-white/30 focus:border-cyan-500/50 focus:outline-none"
          />
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm text-white/60">动作描述</label>
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="描述动作，例如：转身展示背部，单手整理衣摆"
          rows={3}
          className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-white/30 focus:border-cyan-500/50 focus:outline-none"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm text-white/60">动作范围</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setIsGeneral(true)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              isGeneral
                ? 'border border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                : 'border border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            通用动作
          </button>
          <button
            type="button"
            onClick={() => setIsGeneral(false)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              !isGeneral
                ? 'border border-amber-500/50 bg-amber-500/20 text-amber-300'
                : 'border border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            专用动作
          </button>
        </div>
        <p className="text-xs text-white/40">
          通用动作适用于所有姿势；专用动作只会出现在关联姿势下。
        </p>
      </div>

      {!isGeneral && (
        <div className="space-y-2">
          <label className="block text-sm text-white/60">关联姿势</label>
          {poses.length === 0 ? (
            <p className="rounded-lg border border-dashed border-white/10 bg-white/5 px-4 py-3 text-sm text-white/40">
              还没有可关联的姿势素材
            </p>
          ) : (
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-3">
              {poses.map((pose) => {
                const checked = selectedPoseIds.includes(pose.id)
                return (
                  <button
                    key={pose.id}
                    type="button"
                    onClick={() => togglePose(pose.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-all ${
                      checked
                        ? 'bg-amber-500/20 text-amber-200'
                        : 'bg-transparent text-white/70 hover:bg-white/5'
                    }`}
                  >
                    <span>{pose.name}</span>
                    <span className="text-xs">{checked ? '已关联' : '未关联'}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div>
        <label className="mb-1 block text-sm text-white/60">穿戴服装（可选）</label>
        <input
          type="text"
          value={clothing}
          onChange={(event) => setClothing(event.target.value)}
          placeholder="例如：白色连衣裙"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-white/30 focus:border-cyan-500/50 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-white/60">适用范围（可选）</label>
        <input
          type="text"
          value={scope}
          onChange={(event) => setScope(event.target.value)}
          placeholder="例如：适合长裙，不适合大幅度蹲下"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-white/30 focus:border-cyan-500/50 focus:outline-none"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg bg-white/5 px-4 py-2 text-white/60 transition-all hover:bg-white/10"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex-1 rounded-lg bg-gradient-to-r from-cyan-600 to-emerald-600 px-4 py-2 font-medium text-white transition-all hover:shadow-lg hover:shadow-cyan-500/30 disabled:opacity-50"
        >
          {movement?.id ? '更新' : '创建'}
        </button>
      </div>
    </form>
  )
}
